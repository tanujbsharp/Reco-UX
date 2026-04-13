"""
Product Comparator Service for Bsharp Reco.

Implements the comparison engine described in FSD Section 12 and
Architecture Section 7.2:

    1. Receive two product IDs and the tenant cmid.
    2. Generate a canonical product_pair_key (sorted: min-max).
    3. Compute a feature_set_hash (SHA-256 of combined feature values).
    4. Check ComparisonCache for a hit.
    5. On HIT  -> increment hit_count, return cached result.
    6. On MISS -> call Amazon Bedrock to compare products feature-by-feature,
                  generate per-feature commentary, winner declarations,
                  and trade-off implications.
    7. Persist the result to ComparisonCache.
    8. Return the comparison payload.

Cache scope is global within a tenant (cmid). Invalidation happens
naturally when feature data changes (the hash will differ).

Dependencies on packets/products models are handled gracefully --
when they are not yet available (Phase 12), stub product data is used.
"""
import hashlib
import json
import logging
import time

from django.db.models import F

from apps.common.bedrock_client import BedrockClient
from apps.comparisons.models import ComparisonCache
from apps.questions.models import LLMCallLog

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Safe imports -- packets models may not exist yet (Phase 12)
# ---------------------------------------------------------------------------
try:
    from apps.packets.models import Product, FeatureValue
    PACKETS_AVAILABLE = True
except (ImportError, Exception):
    PACKETS_AVAILABLE = False
    logger.info(
        'packets models not available yet -- comparator will use stub data'
    )

# ---------------------------------------------------------------------------
# Bedrock prompt templates
# ---------------------------------------------------------------------------
COMPARISON_SYSTEM_PROMPT = (
    "You are a retail product comparison assistant for Bsharp Reco. "
    "Given two products with their features and values, compare them "
    "feature by feature.\n\n"
    "For each comparable feature:\n"
    "  - Declare a winner (product_1 or product_2, or tie)\n"
    "  - Provide a concise commentary explaining why\n\n"
    "Also provide implications -- trade-off narratives for each product "
    "explaining what a buyer gains and loses by choosing it.\n\n"
    "You MUST respond with ONLY valid JSON matching this schema:\n"
    "{\n"
    '  "feature_comparison": [\n'
    '    {\n'
    '      "feature": "string -- feature name",\n'
    '      "product_1_value": "string -- value for product 1",\n'
    '      "product_2_value": "string -- value for product 2",\n'
    '      "winner": "product_1 | product_2 | tie",\n'
    '      "commentary": "string -- why this product wins this feature"\n'
    '    }\n'
    "  ],\n"
    '  "winner_by_feature": {\n'
    '    "feature_name": "product_1 | product_2 | tie"\n'
    "  },\n"
    '  "implications": {\n'
    '    "product_1": ["string -- trade-off narrative for product 1", ...],\n'
    '    "product_2": ["string -- trade-off narrative for product 2", ...]\n'
    "  }\n"
    "}\n\n"
    "Do NOT include any text outside the JSON object."
)


# ===================================================================
# Public API
# ===================================================================

def compare_products(product_id_1, product_id_2, cmid, session=None):
    """
    Compare two products and return comparison data.

    Args:
        product_id_1: First product ID.
        product_id_2: Second product ID.
        cmid: Tenant identifier.
        session: Optional CustomerSession (for LLM call logging).

    Returns:
        dict with keys:
            product_1      - product detail dict
            product_2      - product detail dict
            feature_comparison - list of per-feature comparisons
            implications   - trade-off narratives per product
            winner_by_feature - dict mapping feature -> winner
            cache_hit      - bool
    """
    # 1. Load product data
    product_1 = _load_product(product_id_1)
    product_2 = _load_product(product_id_2)

    if product_1 is None or product_2 is None:
        missing = []
        if product_1 is None:
            missing.append(product_id_1)
        if product_2 is None:
            missing.append(product_id_2)
        raise ProductNotFoundError(
            f'Product(s) not found: {", ".join(str(m) for m in missing)}'
        )

    # 2. Canonical pair key (sorted)
    pair_key = _make_pair_key(product_id_1, product_id_2)

    # 3. Feature-set hash
    feature_hash = _make_feature_hash(product_1, product_2)

    # 4. Cache lookup
    cache_entry = ComparisonCache.objects.filter(
        product_pair_key=pair_key,
        feature_set_hash=feature_hash,
    ).first()

    if cache_entry is not None:
        # 5. Cache HIT
        ComparisonCache.objects.filter(pk=cache_entry.pk).update(
            hit_count=F('hit_count') + 1,
        )
        return _build_response(
            product_1, product_2,
            feature_comparison=cache_entry.commentary,
            implications=cache_entry.implications,
            winner_by_feature=cache_entry.winner_by_feature,
            cache_hit=True,
        )

    # 6. Cache MISS -- call Bedrock
    comparison_data = _call_bedrock_comparison(product_1, product_2, session)

    feature_comparison = comparison_data.get('feature_comparison', [])
    implications = comparison_data.get('implications', {})
    winner_by_feature = comparison_data.get('winner_by_feature', {})

    # 7. Save to cache
    try:
        ComparisonCache.objects.create(
            product_pair_key=pair_key,
            feature_set_hash=feature_hash,
            cmid=cmid,
            commentary=feature_comparison,
            implications=implications,
            winner_by_feature=winner_by_feature,
        )
    except Exception as e:
        # If a race condition created a duplicate, just log it
        logger.warning('Failed to save comparison cache: %s', e)

    # 8. Return
    return _build_response(
        product_1, product_2,
        feature_comparison=feature_comparison,
        implications=implications,
        winner_by_feature=winner_by_feature,
        cache_hit=False,
    )


# ===================================================================
# Custom exception
# ===================================================================

class ProductNotFoundError(Exception):
    """Raised when one or both products cannot be loaded."""
    pass


# ===================================================================
# Internal helpers
# ===================================================================

def _make_pair_key(id1, id2):
    """Return canonical sorted pair key, e.g. '123-456'."""
    lo, hi = sorted([int(id1), int(id2)])
    return f'{lo}-{hi}'


def _make_feature_hash(product_1, product_2):
    """
    SHA-256 of the combined, sorted feature values for both products.
    Ensures any change in feature data triggers a cache miss.
    """
    combined = {
        'p1': product_1.get('features', {}),
        'p2': product_2.get('features', {}),
    }
    raw = json.dumps(combined, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _load_product(product_id):
    """
    Load product data as a dict.

    Returns None if the product is not found.
    Tries real packets models first, then falls back to stubs.
    """
    if PACKETS_AVAILABLE:
        try:
            product = Product.objects.get(pk=product_id)
            features = {}
            specs = []
            try:
                fv_qs = FeatureValue.objects.filter(
                    product=product,
                ).select_related('feature')
                for fv in fv_qs:
                    features[fv.feature.feature_code] = fv.normalized_value
                    specs.append({
                        'feature_name': fv.feature.feature_name,
                        'feature_code': fv.feature.feature_code,
                        'value': fv.value,
                        'normalized_value': fv.normalized_value,
                    })
            except Exception:
                pass

            return {
                'product_id': product.product_id,
                'product_name': getattr(product, 'product_name', f'Product {product.product_id}'),
                'product_family': getattr(product, 'product_family', ''),
                'brand': getattr(product, 'brand', ''),
                'price': getattr(product, 'price', None),
                'features': features,
                'specs': specs,
            }
        except Product.DoesNotExist:
            return None
        except Exception as e:
            logger.warning('Error loading product %s: %s', product_id, e)

    # Fall back to stubs
    return _get_stub_product(product_id)


def _get_stub_product(product_id):
    """
    Stub product data for development when packets models are
    not yet available (Phase 12 dependency).
    """
    stubs = {
        1001: {
            'product_id': 1001,
            'product_name': 'Product Alpha',
            'product_family': 'family_a',
            'brand': 'Brand A',
            'price': 49999,
            'features': {
                'price': 0.8, 'performance': 0.7, 'battery_life': 0.9,
                'display_quality': 0.6, 'portability': 0.8,
            },
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '49,999', 'normalized_value': 0.8},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'High', 'normalized_value': 0.7},
                {'feature_name': 'Battery Life', 'feature_code': 'battery_life', 'value': '18 hours', 'normalized_value': 0.9},
                {'feature_name': 'Display Quality', 'feature_code': 'display_quality', 'value': 'FHD IPS', 'normalized_value': 0.6},
                {'feature_name': 'Portability', 'feature_code': 'portability', 'value': 'Light', 'normalized_value': 0.8},
            ],
        },
        1002: {
            'product_id': 1002,
            'product_name': 'Product Beta',
            'product_family': 'family_a',
            'brand': 'Brand A',
            'price': 69999,
            'features': {
                'price': 0.6, 'performance': 0.9, 'battery_life': 0.5,
                'display_quality': 0.9, 'portability': 0.5,
            },
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '69,999', 'normalized_value': 0.6},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'Very High', 'normalized_value': 0.9},
                {'feature_name': 'Battery Life', 'feature_code': 'battery_life', 'value': '8 hours', 'normalized_value': 0.5},
                {'feature_name': 'Display Quality', 'feature_code': 'display_quality', 'value': '4K OLED', 'normalized_value': 0.9},
                {'feature_name': 'Portability', 'feature_code': 'portability', 'value': 'Heavy', 'normalized_value': 0.5},
            ],
        },
        1003: {
            'product_id': 1003,
            'product_name': 'Product Gamma',
            'product_family': 'family_b',
            'brand': 'Brand B',
            'price': 34999,
            'features': {
                'price': 0.9, 'performance': 0.5, 'battery_life': 0.8,
                'display_quality': 0.7, 'portability': 0.9,
            },
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '34,999', 'normalized_value': 0.9},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'Medium', 'normalized_value': 0.5},
                {'feature_name': 'Battery Life', 'feature_code': 'battery_life', 'value': '14 hours', 'normalized_value': 0.8},
                {'feature_name': 'Display Quality', 'feature_code': 'display_quality', 'value': 'FHD IPS', 'normalized_value': 0.7},
                {'feature_name': 'Portability', 'feature_code': 'portability', 'value': 'Ultralight', 'normalized_value': 0.9},
            ],
        },
        1004: {
            'product_id': 1004,
            'product_name': 'Product Delta',
            'product_family': 'family_b',
            'brand': 'Brand B',
            'price': 54999,
            'features': {
                'price': 0.5, 'performance': 0.8, 'battery_life': 0.7,
                'display_quality': 0.8, 'portability': 0.6,
            },
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '54,999', 'normalized_value': 0.5},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'High', 'normalized_value': 0.8},
                {'feature_name': 'Battery Life', 'feature_code': 'battery_life', 'value': '10 hours', 'normalized_value': 0.7},
                {'feature_name': 'Display Quality', 'feature_code': 'display_quality', 'value': 'QHD IPS', 'normalized_value': 0.8},
                {'feature_name': 'Portability', 'feature_code': 'portability', 'value': 'Medium', 'normalized_value': 0.6},
            ],
        },
        1005: {
            'product_id': 1005,
            'product_name': 'Product Epsilon',
            'product_family': 'family_c',
            'brand': 'Brand C',
            'price': 42999,
            'features': {
                'price': 0.7, 'performance': 0.6, 'battery_life': 0.6,
                'display_quality': 0.5, 'portability': 0.7,
            },
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '42,999', 'normalized_value': 0.7},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'Medium', 'normalized_value': 0.6},
                {'feature_name': 'Battery Life', 'feature_code': 'battery_life', 'value': '9 hours', 'normalized_value': 0.6},
                {'feature_name': 'Display Quality', 'feature_code': 'display_quality', 'value': 'FHD TN', 'normalized_value': 0.5},
                {'feature_name': 'Portability', 'feature_code': 'portability', 'value': 'Light', 'normalized_value': 0.7},
            ],
        },
    }

    return stubs.get(int(product_id))


def _call_bedrock_comparison(product_1, product_2, session=None):
    """
    Call Amazon Bedrock (Claude) to generate the feature-by-feature
    comparison, winner declarations, and trade-off implications.

    Returns a parsed dict matching the COMPARISON_SYSTEM_PROMPT schema.
    On failure returns a deterministic fallback comparison.
    """
    prompt = _build_comparison_prompt(product_1, product_2)
    client = BedrockClient()
    start_ms = _now_ms()

    try:
        raw_response = client.invoke(
            prompt=prompt,
            system_prompt=COMPARISON_SYSTEM_PROMPT,
            temperature=0.5,
            max_tokens=2048,
        )
        latency = _now_ms() - start_ms

        result = _parse_comparison_response(raw_response, product_1, product_2)

        # Log the LLM call
        _log_llm_call(session, 'comparison', latency, cache_hit=False)

        return result

    except Exception as e:
        latency = _now_ms() - start_ms
        _log_llm_call(session, 'comparison', latency, cache_hit=False)
        logger.warning(
            'Bedrock comparison call failed for %s vs %s: %s',
            product_1.get('product_id'), product_2.get('product_id'), e,
        )
        return _fallback_comparison(product_1, product_2)


def _build_comparison_prompt(product_1, product_2):
    """Build the user prompt for Bedrock comparison call."""
    parts = []

    parts.append("Compare the following two products feature by feature.\n")

    # Product 1
    parts.append(f"PRODUCT 1: {product_1.get('product_name', 'Unknown')}")
    parts.append(f"  Brand: {product_1.get('brand', 'N/A')}")
    parts.append(f"  Price: {product_1.get('price', 'N/A')}")
    specs_1 = product_1.get('specs', [])
    if specs_1:
        parts.append("  Features:")
        for spec in specs_1:
            parts.append(
                f"    {spec.get('feature_name', spec.get('feature_code', '?'))}: "
                f"{spec.get('value', 'N/A')}"
            )

    parts.append("")

    # Product 2
    parts.append(f"PRODUCT 2: {product_2.get('product_name', 'Unknown')}")
    parts.append(f"  Brand: {product_2.get('brand', 'N/A')}")
    parts.append(f"  Price: {product_2.get('price', 'N/A')}")
    specs_2 = product_2.get('specs', [])
    if specs_2:
        parts.append("  Features:")
        for spec in specs_2:
            parts.append(
                f"    {spec.get('feature_name', spec.get('feature_code', '?'))}: "
                f"{spec.get('value', 'N/A')}"
            )

    parts.append("\nCompare these products and respond with JSON.")
    return "\n".join(parts)


def _parse_comparison_response(raw_response, product_1, product_2):
    """
    Parse the Bedrock response into a structured comparison dict.
    Falls back to deterministic comparison on parse failure.
    """
    text = raw_response.strip()

    # Strip markdown code fences if present
    if text.startswith('```'):
        first_newline = text.index('\n')
        text = text[first_newline + 1:]
        if text.endswith('```'):
            text = text[:-3].strip()

    try:
        result = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try:
                result = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                logger.warning(
                    'Failed to parse comparison response for %s vs %s',
                    product_1.get('product_id'),
                    product_2.get('product_id'),
                )
                return _fallback_comparison(product_1, product_2)
        else:
            return _fallback_comparison(product_1, product_2)

    # Ensure required keys exist
    result.setdefault('feature_comparison', [])
    result.setdefault('winner_by_feature', {})
    result.setdefault('implications', {'product_1': [], 'product_2': []})

    return result


def _fallback_comparison(product_1, product_2):
    """
    Generate a deterministic fallback comparison when Bedrock is
    unavailable. Uses normalized feature values to declare winners.
    """
    features_1 = product_1.get('features', {})
    features_2 = product_2.get('features', {})
    specs_1 = {s['feature_code']: s for s in product_1.get('specs', [])}
    specs_2 = {s['feature_code']: s for s in product_2.get('specs', [])}

    all_features = sorted(set(list(features_1.keys()) + list(features_2.keys())))

    feature_comparison = []
    winner_by_feature = {}

    for feature_code in all_features:
        val_1 = features_1.get(feature_code, 0.0)
        val_2 = features_2.get(feature_code, 0.0)

        display_1 = specs_1.get(feature_code, {}).get('value', str(val_1))
        display_2 = specs_2.get(feature_code, {}).get('value', str(val_2))

        feature_name = (
            specs_1.get(feature_code, {}).get('feature_name')
            or specs_2.get(feature_code, {}).get('feature_name')
            or feature_code.replace('_', ' ').title()
        )

        if val_1 > val_2:
            winner = 'product_1'
            commentary = (
                f'{product_1["product_name"]} scores higher on {feature_name.lower()}.'
            )
        elif val_2 > val_1:
            winner = 'product_2'
            commentary = (
                f'{product_2["product_name"]} scores higher on {feature_name.lower()}.'
            )
        else:
            winner = 'tie'
            commentary = f'Both products are comparable on {feature_name.lower()}.'

        feature_comparison.append({
            'feature': feature_name,
            'product_1_value': str(display_1),
            'product_2_value': str(display_2),
            'winner': winner,
            'commentary': commentary,
        })
        winner_by_feature[feature_name] = winner

    p1_wins = sum(1 for v in winner_by_feature.values() if v == 'product_1')
    p2_wins = sum(1 for v in winner_by_feature.values() if v == 'product_2')

    implications = {
        'product_1': [
            f'{product_1["product_name"]} wins on {p1_wins} feature(s).',
            f'Consider this product if those features are your priority.',
        ],
        'product_2': [
            f'{product_2["product_name"]} wins on {p2_wins} feature(s).',
            f'Consider this product if those features are your priority.',
        ],
    }

    return {
        'feature_comparison': feature_comparison,
        'winner_by_feature': winner_by_feature,
        'implications': implications,
    }


def _log_llm_call(session, call_type, latency_ms, cache_hit=False):
    """Log the LLM call for observability and cost tracking."""
    if session is None:
        return
    try:
        LLMCallLog.objects.create(
            session=session,
            call_type=call_type,
            latency_ms=int(latency_ms),
            cache_hit=cache_hit,
        )
    except Exception:
        logger.warning(
            'Failed to log LLM call for session %s',
            getattr(session, 'session_id', '?'),
        )


def _now_ms():
    """Current time in milliseconds."""
    return int(time.time() * 1000)


def _build_response(product_1, product_2, feature_comparison,
                     implications, winner_by_feature, cache_hit):
    """Assemble the final comparison response dict."""
    # Strip internal keys from product dicts for the API response
    def _clean_product(p):
        return {
            'product_id': p.get('product_id'),
            'product_name': p.get('product_name'),
            'product_family': p.get('product_family', ''),
            'brand': p.get('brand', ''),
            'price': p.get('price'),
            'specs': p.get('specs', []),
        }

    return {
        'product_1': _clean_product(product_1),
        'product_2': _clean_product(product_2),
        'feature_comparison': feature_comparison,
        'implications': implications,
        'winner_by_feature': winner_by_feature,
        'cache_hit': cache_hit,
    }
