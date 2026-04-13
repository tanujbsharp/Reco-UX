"""
RAG (Retrieval-Augmented Generation) service for Product Chat.

Pipeline:
    1. Receive customer question + product IDs.
    2. Load structured product context directly from the catalog.
    3. Optionally query OpenSearch ``reco_product_kb`` for extra chunks.
    4. Build a grounded prompt with product context + retrieved chunks.
    5. Call Bedrock (Claude Sonnet) for an answer.
    6. Return the answer together with source references.

Used by: product_chat.views.ask
"""
import logging

from apps.common.bedrock_client import bedrock_client
from apps.common.opensearch_client import opensearch_client

logger = logging.getLogger(__name__)

PRODUCT_KB_INDEX = 'reco_product_kb'

SYSTEM_PROMPT = (
    "You are a helpful retail product expert assistant. "
    "Answer using ONLY the provided structured product context and optional product knowledge chunks. "
    "On a single-product question, answer about that specific product. "
    "On a comparison question, compare only the provided products. "
    "If the answer is not supported by the provided context, say so clearly. "
    "Be concise, specific, and practical."
)

try:
    from apps.packets.models import Product, ProductContent, FeatureValue
    PACKETS_AVAILABLE = True
except (ImportError, Exception):
    PACKETS_AVAILABLE = False


def load_catalog_product_context(product_ids, cmid):
    if not PACKETS_AVAILABLE or not product_ids:
        return []

    try:
        products = list(
            Product.objects
            .filter(packet__cmid=cmid, product_id__in=product_ids)
            .select_related('packet')
        )
        if not products:
            return []

        product_map = {product.product_id: product for product in products}
        features_by_product = {product_id: [] for product_id in product_map}
        content_by_product = {}

        feature_values = (
            FeatureValue.objects
            .filter(product_id__in=product_map.keys())
            .select_related('feature')
            .order_by('feature__feature_name')
        )
        for feature_value in feature_values:
            features_by_product.setdefault(feature_value.product_id, []).append({
                'label': feature_value.feature.feature_name,
                'code': feature_value.feature.feature_code,
                'value': str(feature_value.value or '').strip(),
            })

        for content in ProductContent.objects.filter(product_id__in=product_map.keys()):
            content_by_product[content.product_id] = content

        context = []
        for product_id in product_ids:
            product = product_map.get(product_id)
            if not product:
                continue
            content = content_by_product.get(product_id)
            context.append({
                'product_id': product.product_id,
                'product_name': product.model,
                'family': product.family,
                'price': float(product.price or 0),
                'best_for': getattr(content, 'best_for', '') if content else '',
                'fit_summary': getattr(content, 'fit_summary', '') if content else '',
                'key_highlights': list(getattr(content, 'key_highlights', []) or []) if content else [],
                'specs': features_by_product.get(product.product_id, []),
            })
        return context
    except Exception as exc:
        logger.warning('Failed to load catalog product context for chat: %s', exc)
        return []


def query_product_kb(question, product_ids, cmid, size=5):
    """
    Search the OpenSearch product knowledge base for relevant chunks.
    """
    query = {
        'query': {
            'bool': {
                'must': [
                    {
                        'multi_match': {
                            'query': question,
                            'fields': ['content', 'title', 'product_name'],
                            'type': 'best_fields',
                        },
                    },
                ],
                'filter': [
                    {'term': {'cmid': cmid}},
                    {'terms': {'product_id': product_ids}},
                ],
            },
        },
    }

    try:
        response = opensearch_client.search(PRODUCT_KB_INDEX, query, size=size)
        hits = response.get('hits', {}).get('hits', [])
        chunks = []
        for hit in hits:
            source = hit.get('_source', {})
            chunks.append({
                'content': source.get('content', ''),
                'product_id': source.get('product_id'),
                'product_name': source.get('product_name', ''),
                'title': source.get('title', ''),
                'score': hit.get('_score', 0),
            })
        return chunks
    except Exception as exc:
        logger.warning(
            'OpenSearch product KB query failed (index=%s): %s — proceeding with catalog context only.',
            PRODUCT_KB_INDEX, exc,
        )
        return []


def build_prompt(question, product_context, chunks):
    context_parts = []

    if product_context:
        context_parts.append("Structured Product Context:")
        for idx, product in enumerate(product_context, 1):
            context_parts.append(
                f"[Product {idx}: {product.get('product_name')}]"
            )
            context_parts.append(
                f"Family: {product.get('family', '')} | Price: {product.get('price', 0)}"
            )
            if product.get('best_for'):
                context_parts.append(f"Best for: {product['best_for']}")
            if product.get('fit_summary'):
                context_parts.append(f"Fit summary: {product['fit_summary']}")
            highlights = product.get('key_highlights', [])[:5]
            if highlights:
                context_parts.append("Key highlights: " + ", ".join(str(item) for item in highlights))
            specs = product.get('specs', [])[:12]
            if specs:
                context_parts.append("Specs:")
                for spec in specs:
                    context_parts.append(f"- {spec.get('label', spec.get('code', 'Spec'))}: {spec.get('value', '')}")
            context_parts.append("")

    if chunks:
        context_parts.append("Additional Product Knowledge Chunks:")
        for i, chunk in enumerate(chunks, 1):
            label = chunk.get('product_name') or f"Product {chunk.get('product_id', '?')}"
            title = chunk.get('title', '')
            header = f"[Source {i}: {label}"
            if title:
                header += f" — {title}"
            header += "]"
            context_parts.append(f"{header}\n{chunk['content']}")

    if not context_parts:
        context_parts.append("No structured product context or product knowledge chunks were available.")

    return (
        f"{chr(10).join(context_parts)}\n\n"
        f"Customer Question: {question}\n\n"
        "Answer strictly from the provided context. If multiple products are provided, compare them directly where helpful."
    )


def get_answer(question, product_ids, cmid):
    """
    Full RAG pipeline: load catalog context, optionally retrieve chunks, build
    prompt, and call Bedrock.
    """
    product_context = load_catalog_product_context(product_ids, cmid)
    chunks = query_product_kb(question, product_ids, cmid)
    prompt = build_prompt(question, product_context, chunks)

    try:
        answer = bedrock_client.invoke(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=1024,
        )
    except Exception as exc:
        logger.error('Bedrock call failed for product chat: %s', exc)
        raise

    sources = [
        {
            'type': 'catalog_context',
            'product_id': product.get('product_id'),
            'product_name': product.get('product_name', ''),
            'title': 'Structured product context',
            'relevance_score': 1.0,
        }
        for product in product_context
    ]
    sources.extend([
        {
            'type': 'kb_chunk',
            'product_id': chunk.get('product_id'),
            'product_name': chunk.get('product_name', ''),
            'title': chunk.get('title', ''),
            'relevance_score': chunk.get('score', 0),
        }
        for chunk in chunks
    ])

    return {
        'answer': answer,
        'sources': sources,
    }
