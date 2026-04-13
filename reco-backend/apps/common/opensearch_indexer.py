"""
Product Knowledge Base indexer for OpenSearch.

Chunks Product data (features, content, specs) into individual OpenSearch
documents and bulk-indexes them to the reco_product_kb index.

Used by the Packet Builder pipeline after products are imported and by the
crawl pipeline after product pages are scraped.
"""
import logging
import uuid
from datetime import datetime, timezone

from apps.common.opensearch_client import opensearch_client
from apps.common.opensearch_indexes import INDEX_PRODUCT_KB
from apps.packets.models import FeatureValue, Product, ProductContent

logger = logging.getLogger(__name__)


def _make_chunk_id():
    return str(uuid.uuid4())


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def index_product(product: Product):
    """
    Generate and index all chunks for a single product.

    Chunks created:
      1. One 'overview' chunk with basic product info.
      2. One chunk per FeatureValue.
      3. One 'content' chunk from ProductContent (if present).

    Returns:
        int: number of documents indexed.
    """
    packet = product.packet
    base = {
        'cmid': packet.cmid,
        'packet_id': packet.packet_id,
        'product_id': product.product_id,
        'product_code': product.product_code,
        'product_model': product.model,
        'family': product.family,
        'price': float(product.price),
        'created_at': _now_iso(),
    }

    docs = []

    # 1. Overview chunk
    overview_text = (
        f'{product.model} from the {product.family} family. '
        f'Product code: {product.product_code}. '
        f'Price: {product.price}.'
    )
    docs.append({
        **base,
        'chunk_id': _make_chunk_id(),
        'chunk_type': 'overview',
        'content': overview_text,
        'feature_code': None,
        'feature_name': None,
        'value': None,
        'metadata': {},
    })

    # 2. Feature chunks
    feature_values = FeatureValue.objects.select_related('feature').filter(product=product)
    for fv in feature_values:
        chunk_text = (
            f'{fv.feature.feature_name}: {fv.value}'
        )
        docs.append({
            **base,
            'chunk_id': _make_chunk_id(),
            'chunk_type': 'feature',
            'content': chunk_text,
            'feature_code': fv.feature.feature_code,
            'feature_name': fv.feature.feature_name,
            'value': fv.value,
            'metadata': {
                'normalized_value': fv.normalized_value,
                'is_comparable': fv.feature.is_comparable,
                'is_scoreable': fv.feature.is_scoreable,
            },
        })

    # 3. Content chunk (hero summary, highlights, tips)
    try:
        pc = product.content
    except ProductContent.DoesNotExist:
        pc = None

    if pc:
        parts = []
        if pc.fit_summary:
            parts.append(f'Fit summary: {pc.fit_summary}')
        if pc.key_highlights:
            parts.append('Key highlights: ' + ', '.join(str(h) for h in pc.key_highlights))
        if pc.best_for:
            parts.append(f'Best for: {pc.best_for}')
        if pc.salesperson_tips:
            parts.append('Salesperson tips: ' + '; '.join(str(t) for t in pc.salesperson_tips))

        if parts:
            docs.append({
                **base,
                'chunk_id': _make_chunk_id(),
                'chunk_type': 'content',
                'content': ' | '.join(parts),
                'feature_code': None,
                'feature_name': None,
                'value': None,
                'metadata': {
                    'hero_image_url': pc.hero_image_url,
                    'gallery_count': len(pc.gallery_urls) if pc.gallery_urls else 0,
                },
            })

    if docs:
        try:
            opensearch_client.bulk_index(INDEX_PRODUCT_KB, docs)
            logger.info('Indexed %d chunks for product %s', len(docs), product.product_code)
        except Exception as exc:
            logger.error('Failed to index product %s: %s', product.product_code, exc)

    return len(docs)


def index_packet_products(packet_id: int):
    """
    Index all products belonging to a packet.

    Args:
        packet_id: The Packet primary key.

    Returns:
        int: total chunks indexed.
    """
    products = Product.objects.filter(packet_id=packet_id)
    total = 0
    for product in products:
        total += index_product(product)
    logger.info('Indexed %d total chunks for packet %d', total, packet_id)
    return total
