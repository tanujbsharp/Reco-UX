"""
Recommendation and Product Detail views for Bsharp Reco.

Endpoints:
    GET /api/sessions/<session_id>/recommendations
        — Run scoring pipeline, generate explanations, return top 3.

    GET /api/products/<product_id>
        — Return merged product data (manual + crawled).
"""
import json
import logging
import re
import time

from rest_framework import status
from apps.common.permissions import CsrfExemptSessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.sessions_app.models import CustomerSession, SessionAnswer
from apps.recommendations.models import RecommendationResult
from apps.recommendations.scoring import RecommendationScorer
from apps.recommendations.explanation import generate_explanations_batch
from apps.common.bedrock_client import BedrockClient
from apps.questions.models import LLMCallLog

logger = logging.getLogger(__name__)

CUSTOMER_FIT_FRAGMENT_PATTERNS = [
    re.compile(r'\s*\(\s*\d+(?:\.\d+)?%?\s*fit(?:\s*score)?\s*\)', re.IGNORECASE),
    re.compile(r'\bfit\s*score\s*of\s*\d+(?:\.\d+)?%?\b', re.IGNORECASE),
    re.compile(r'\b\d+(?:\.\d+)?%?\s*fit(?:\s*score)?\b', re.IGNORECASE),
]
CONSERVATIVE_RERANK_MAX_OUTSIDERS = 1
CONSERVATIVE_RERANK_MIN_SCORE_BUFFER = 0.18
CONSERVATIVE_RERANK_RELATIVE_SCORE_BUFFER = 0.025
DISPLAY_TOP_FIT_FLOOR = 82
DISPLAY_NEAR_TOP_FIT_FLOOR = 74

# ---------------------------------------------------------------------------
# Safe imports — packets models may not exist yet (Phase 12)
# ---------------------------------------------------------------------------
try:
    from apps.packets.models import Product
    PACKETS_AVAILABLE = True
except (ImportError, Exception):
    PACKETS_AVAILABLE = False


RERANK_SYSTEM_PROMPT = (
    "You are the final recommendation selector for Bsharp Reco. "
    "Choose the three Lenovo laptops that best fit the customer's actual needs.\n\n"
    "RULES:\n"
    "0. The numeric scorer has already ranked these candidates by fit. Treat that base order as the default truth. "
    "Only change it when the evidence is clearly stronger for a nearby alternative.\n"
    "1. Prefer best fit over strongest hardware.\n"
    "2. Penalize overkill. Do not reward premium power if the customer's needs are moderate.\n"
    "3. Use the customer's discovery input, follow-up answers, and product specs together.\n"
    "4. If the customer sounds like student, Office, browsing, light coding, or general productivity, "
    "favor right-sized value and portability over premium extras unless the answers clearly justify them.\n"
    "5. If the customer clearly needs gaming, 3D, rendering, or heavier creative work, it is valid to select dGPU/performance models.\n"
    "6. Return exactly 3 product IDs chosen from the candidates provided.\n"
    "7. Also return a final fit percentage for each selected product. These fit percentages must be in descending order and must reflect the final recommendation order.\n"
    "8. The fit percentages should be honest but shortlist-relative: a strong top recommendation can be in the 70s or 80s; do not force equal or arbitrary spacing.\n\n"
    "9. Higher right_sized_performance is better. Higher performance_overkill_risk means the laptop exceeds the need by too much. Higher performance_undershoot_risk means it falls short.\n"
    "10. If a product has stronger raw specs but materially worse right_sized_performance or value_for_money, it should usually rank lower unless the answers explicitly call for that extra headroom.\n\n"
    "11. Do not let marketing-style copy such as 'Best for' or 'Fit summary' outweigh the base scores and fit-to-need signals. "
    "Use those text fields only as supporting context.\n"
    "12. Be conservative. Prefer small reordering of the current top products over replacing them entirely.\n\n"
    "Respond with ONLY valid JSON:\n"
    "{\n"
    '  "ordered_product_ids": [integer, integer, integer],\n'
    '  "fit_percentages": {\n'
    '    "PRODUCT_ID": integer,\n'
    '    "PRODUCT_ID_2": integer,\n'
    '    "PRODUCT_ID_3": integer\n'
    "  },\n"
    '  "reasoning": {\n'
    '    "PRODUCT_ID": "short explanation",\n'
    '    "PRODUCT_ID_2": "short explanation",\n'
    '    "PRODUCT_ID_3": "short explanation"\n'
    "  }\n"
    "}"
)


@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def get_recommendations(request, session_id):
    """
    GET /api/sessions/<session_id>/recommendations

    Full recommendation pipeline:
        1. Load session, voice tags, answers
        2. Run scoring pipeline (RecommendationScorer)
        3. Generate LLM explanations for top 3
        4. Save RecommendationResult records
        5. Return top 3 with full detail

    Returns existing results if the session already has saved
    recommendations (idempotent).
    """
    # --- Load session ---
    try:
        session = CustomerSession.objects.get(pk=session_id)
    except CustomerSession.DoesNotExist:
        return Response(
            {'detail': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # --- Check for existing results (idempotent) ---
    existing = RecommendationResult.objects.filter(session=session).order_by('rank')
    if existing.exists() and not _recommendations_are_stale(session, existing):
        results = _serialize_results(existing)
        return Response({
            'session_id': session_id,
            'recommendations': results,
            'cached': True,
        })
    if existing.exists():
        existing.delete()

    # --- Load answers ---
    answers = list(
        SessionAnswer.objects.filter(session=session).order_by('created_at')
    )

    # --- Step 2: Run scoring pipeline ---
    try:
        scorer = RecommendationScorer(session_id)
        scored_products = scorer.calculate_scores(top_n=6)
    except Exception as e:
        logger.exception('Scoring pipeline failed for session %s', session_id)
        return Response(
            {'detail': f'Scoring failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if not scored_products:
        return Response(
            {'detail': 'No products available for recommendation.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    scored_products = _rerank_recommendations_with_llm(
        session, scored_products, answers=answers,
    )

    # --- Step 3: Generate LLM explanations ---
    try:
        explanations = generate_explanations_batch(
            session, scored_products, answers=answers,
        )
    except Exception as e:
        logger.warning(
            'Explanation generation failed for session %s: %s — '
            'continuing without explanations', session_id, e,
        )
        explanations = {}

    # --- Step 4: Save RecommendationResult records ---
    saved_results = []
    for product in scored_products:
        pid = product['product_id']
        explanation = explanations.get(pid, {})
        explanation_json = json.dumps(explanation) if explanation else ''

        result = RecommendationResult.objects.create(
            session=session,
            product_id=pid,
            rank=product['rank'],
            final_score=product['final_score'],
            match_percentage=product['match_percentage'],
            explanation_text=explanation_json,
            scoring_breakdown=product.get('scoring_breakdown'),
        )
        saved_results.append(result)

    # Update session status
    session.status = 'recommended'
    session.save(update_fields=['status', 'updated_at'])

    # --- Step 5: Return response ---
    results = _serialize_results(saved_results, explanations_cache=explanations)

    return Response({
        'session_id': session_id,
        'recommendations': results,
        'cached': False,
    })


@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def get_product_detail(request, product_id):
    """
    GET /api/products/<product_id>

    Returns merged product data (manual + crawled).
    Includes: specs, gallery, docs, accessories, finance.

    Handles gracefully when packets models are not yet built.
    """
    if not PACKETS_AVAILABLE:
        return Response(
            _get_stub_product_detail(product_id),
        )

    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return Response(
            {'detail': 'Product not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Build comprehensive product detail
    detail = _build_product_detail(product)
    return Response(detail)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _serialize_results(results, explanations_cache=None):
    """
    Serialize a list of RecommendationResult instances into the API
    response format, enriched with real product data.
    """
    # Try to load product data
    product_map = {}
    try:
        from apps.packets.models import Product, FeatureValue, ProductContent
        product_ids = [
            r.product_id if isinstance(r, RecommendationResult) else r.get('product_id')
            for r in results
        ]
        for product in Product.objects.filter(product_id__in=product_ids):
            content = ProductContent.objects.filter(product=product).first()
            features = FeatureValue.objects.filter(product=product).select_related('feature')
            specs = [{'label': fv.feature.feature_name, 'value': fv.value} for fv in features]
            derived_fields = _derive_frontend_fields(specs)

            product_map[product.product_id] = {
                'model': product.model,
                'brand': 'Lenovo',
                'family': product.family,
                'price': float(product.price),
                'product_code': product.product_code,
                'best_for': content.best_for if content else '',
                'fit_summary': content.fit_summary if content else '',
                'key_highlights': content.key_highlights if content else [],
                'salesperson_tips': content.salesperson_tips if content else [],
                'image': (
                    content.hero_image_url
                    or ((content.gallery_urls or [None])[0] if content else None)
                    or ''
                ),
                'gallery': content.gallery_urls if content else [],
                'specs': specs,
                'accessories': _load_accessories(product),
                'finance': _load_finance(product),
                **derived_fields,
            }
    except Exception as e:
        logger.warning('Could not load product data for serialization: %s', e)

    output = []
    for result in results:
        if isinstance(result, RecommendationResult):
            explanation = {}
            if result.explanation_text:
                try:
                    explanation = json.loads(result.explanation_text)
                except (json.JSONDecodeError, TypeError):
                    explanation = {'whyRecommended': result.explanation_text}

            pdata = product_map.get(result.product_id, {})
            display_match_percentage = (
                result.scoring_breakdown.get('display_match_percentage')
                if isinstance(result.scoring_breakdown, dict)
                else None
            )
            raw_match_percentage = (
                result.scoring_breakdown.get('raw_match_percentage')
                if isinstance(result.scoring_breakdown, dict)
                else None
            )
            visible_match_percentage = int(display_match_percentage or result.match_percentage or 0)
            fit_summary = _sanitize_customer_facing_text(
                explanation.get('fitSummary') or pdata.get('fit_summary', '')
            )
            key_highlights = _sanitize_customer_facing_list(
                explanation.get('keyHighlights') or pdata.get('key_highlights', [])
            )
            matched_benefits = _sanitize_customer_facing_list(
                explanation.get('matchedBenefits', [])
            )
            trade_offs = _sanitize_customer_facing_list(
                explanation.get('tradeOffs', [])
            )
            pros = _sanitize_customer_facing_list(explanation.get('pros', []))
            cons = _sanitize_customer_facing_list(explanation.get('cons', []))
            why_recommended = _sanitize_customer_facing_text(
                explanation.get('whyRecommended', '')
            )
            output.append({
                'result_id': result.result_id,
                'product_id': result.product_id,
                'id': str(result.product_id),
                'rank': result.rank,
                'final_score': result.final_score,
                'match_score': visible_match_percentage,
                'match_percentage': visible_match_percentage,
                'raw_match_percentage': int(raw_match_percentage or result.match_percentage or 0),
                # Product fields for the frontend
                'model': pdata.get('model', f'Product {result.product_id}'),
                'brand': pdata.get('brand', 'Lenovo'),
                'family': pdata.get('family', ''),
                'price': pdata.get('price', 0),
                'product_code': pdata.get('product_code', ''),
                'image': pdata.get('image', ''),
                'gallery': pdata.get('gallery', []),
                'best_for': pdata.get('best_for', ''),
                'fit_summary': fit_summary,
                'key_highlights': key_highlights,
                'salesperson_tips': _sanitize_customer_facing_list(
                    pdata.get('salesperson_tips', [])
                ),
                'specs': pdata.get('specs', []),
                'chip': pdata.get('chip', ''),
                'memory': pdata.get('memory', ''),
                'storage': pdata.get('storage', ''),
                'display': pdata.get('display', ''),
                'screen_size': pdata.get('screen_size', ''),
                'battery_life': pdata.get('battery_life', ''),
                'battery_hours': pdata.get('battery_hours', ''),
                'weight': pdata.get('weight', ''),
                'graphics': pdata.get('graphics', ''),
                'ports': pdata.get('ports', ''),
                'finish': pdata.get('finish', ''),
                'performance_tier': pdata.get('performance_tier', ''),
                'noise_level': pdata.get('noise_level', ''),
                'accessories': pdata.get('accessories', []),
                'finance': pdata.get('finance', []),
                'documents': [],
                # Explanation fields
                'why_recommended': why_recommended,
                'matched_benefits': matched_benefits,
                'trade_offs': trade_offs,
                'pros': pros,
                'cons': cons,
                'implications': _build_implications(matched_benefits, trade_offs),
                'explanation': explanation,
                'scoring_breakdown': result.scoring_breakdown,
                'created_at': result.created_at.isoformat() if result.created_at else None,
            })
        else:
            output.append(result)

    return output


def _recommendations_are_stale(session, existing_results):
    latest_answer = (
        SessionAnswer.objects
        .filter(session=session)
        .order_by('-created_at')
        .values_list('created_at', flat=True)
        .first()
    )
    if latest_answer is None:
        return False

    latest_result = max((result.created_at for result in existing_results), default=None)
    if latest_result is None:
        return False

    return latest_answer > latest_result


def _rerank_recommendations_with_llm(session, scored_products, answers=None):
    if not scored_products:
        return scored_products

    if answers is None:
        answers = list(
            SessionAnswer.objects.filter(session=session).order_by('created_at')
        )

    candidate_ids = [product['product_id'] for product in scored_products]
    candidate_context = _load_candidate_context(candidate_ids)
    prompt = _build_rerank_prompt(session, answers, scored_products, candidate_context)
    start_ms = _now_ms()

    try:
        client = BedrockClient()
        raw_response = client.invoke(
            prompt=prompt,
            system_prompt=RERANK_SYSTEM_PROMPT,
            temperature=0.25,
            max_tokens=1200,
        )
        ordered_ids, fit_percentages = _parse_rerank_response(raw_response, candidate_ids)
        ordered_ids = _apply_conservative_rerank(ordered_ids, scored_products)
        _log_llm_call(session, 'rerank', _now_ms() - start_ms)
    except Exception as exc:
        logger.warning('Recommendation rerank failed for session %s: %s', session.session_id, exc)
        _log_llm_call(session, 'rerank', _now_ms() - start_ms)
        ordered_ids = candidate_ids[:3]
        fit_percentages = {}

    ranked_map = {product['product_id']: dict(product) for product in scored_products}
    reranked = []
    for rank_index, product_id in enumerate(ordered_ids, start=1):
        product = ranked_map.get(product_id)
        if not product:
            continue
        product['rank'] = rank_index
        reranked.append(product)

    if len(reranked) < 3:
        for product in scored_products:
            if product['product_id'] in {item['product_id'] for item in reranked}:
                continue
            product_copy = dict(product)
            product_copy['rank'] = len(reranked) + 1
            reranked.append(product_copy)
            if len(reranked) == 3:
                break

    reranked = reranked[:3]
    _apply_display_match_percentages(reranked, fit_percentages)
    return reranked


def _apply_display_match_percentages(reranked_products, fit_percentages=None):
    if not reranked_products:
        return
    fit_percentages = fit_percentages or {}

    base_display_scores = []
    for product in reranked_products:
        raw_match = int(product.get('match_percentage', 0) or 0)
        base_display_scores.append(
            max(0, min(100, int(fit_percentages.get(product.get('product_id'), raw_match))))
        )

    previous_fit = None
    top_base = base_display_scores[0] if base_display_scores else 0
    for index, product in enumerate(reranked_products):
        raw_match = int(product.get('match_percentage', 0) or 0)
        base_display_fit = max(
            0,
            min(100, int(fit_percentages.get(product.get('product_id'), raw_match)))
        )
        final_fit = _calibrate_display_match_percentage(
            base_display_fit,
            rank_index=index,
            top_base_fit=top_base,
        )
        if previous_fit is not None and final_fit > previous_fit:
            final_fit = previous_fit
        breakdown = product.get('scoring_breakdown')
        if not isinstance(breakdown, dict):
            breakdown = {}
            product['scoring_breakdown'] = breakdown
        breakdown['raw_match_percentage'] = raw_match
        breakdown['base_display_match_percentage'] = base_display_fit
        breakdown['display_match_percentage'] = final_fit
        breakdown['final_order_source'] = 'llm_rerank'
        product['match_percentage'] = final_fit
        previous_fit = final_fit


def _load_candidate_context(product_ids):
    context = {}
    if not PACKETS_AVAILABLE:
        return context

    try:
        from apps.packets.models import Product, FeatureValue, ProductContent

        products = Product.objects.filter(product_id__in=product_ids)
        feature_values = (
            FeatureValue.objects
            .filter(product__in=products)
            .select_related('product', 'feature')
        )
        features_by_product = {}
        for feature_value in feature_values:
            features_by_product.setdefault(feature_value.product_id, []).append(
                {
                    'code': feature_value.feature.feature_code,
                    'label': feature_value.feature.feature_name,
                    'value': str(feature_value.value or '').strip(),
                }
            )

        content_by_product = {
            content.product_id: content
            for content in ProductContent.objects.filter(product__in=products)
        }

        for product in products:
            content = content_by_product.get(product.product_id)
            context[product.product_id] = {
                'model': product.model,
                'family': product.family,
                'price': float(product.price or 0),
                'best_for': getattr(content, 'best_for', '') if content else '',
                'fit_summary': getattr(content, 'fit_summary', '') if content else '',
                'specs': features_by_product.get(product.product_id, []),
            }
    except Exception as exc:
        logger.warning('Could not build candidate context for rerank: %s', exc)

    return context


def _build_rerank_prompt(session, answers, scored_products, candidate_context):
    parts = [
        f"Session ID: {session.session_id}",
        f"Discovery mode: {session.discovery_mode or 'guided'}",
    ]

    first_profile = (
        scored_products[0].get('scoring_breakdown', {}).get('requirement_profile', {})
        if scored_products else {}
    )
    if first_profile:
        parts.append(
            "Requirement profile: "
            f"required_capability={first_profile.get('required_capability')} "
            f"| ideal_capability={first_profile.get('ideal_capability')} "
            f"| headroom_preference={first_profile.get('headroom_preference')} "
            f"| capability_label={first_profile.get('capability_label')} "
            f"| overkill_sensitivity={first_profile.get('overkill_sensitivity')}"
        )
        parts.append(
            "Interpretation: right_sized_performance closer to 1.0 means the product is adequately sized "
            "without overshooting by much. Lower overkill and undershoot risk are better."
        )

    discovery_answers = [answer for answer in answers if answer.from_voice]
    if discovery_answers:
        parts.append("\nDiscovery input:")
        for answer in discovery_answers:
            parts.append(f'- "{answer.answer_value}"')

    follow_ups = [answer for answer in answers if not answer.from_voice]
    if follow_ups:
        parts.append("\nFollow-up answers:")
        for answer in follow_ups:
            parts.append(f"Q: {answer.question_text}")
            parts.append(f"A: {answer.answer_value}")

    parts.append("\nCandidates:")
    top_three_ids = [candidate['product_id'] for candidate in scored_products[:3]]
    for original_rank, candidate in enumerate(scored_products, start=1):
        candidate_id = candidate['product_id']
        product_context = candidate_context.get(candidate_id, {})
        score_gap = 0.0
        if scored_products:
            score_gap = float(scored_products[0].get('final_score', 0) or 0) - float(
                candidate.get('final_score', 0) or 0
            )
        parts.append(
            f"- Product {candidate_id}: {candidate.get('product_name', 'Unknown')} "
            f"| base_rank={original_rank} "
            f"| family={candidate.get('family', '')} "
            f"| score={candidate.get('final_score', 0):.2f} "
            f"| score_gap_from_rank1={score_gap:.2f} "
            f"| match={candidate.get('match_percentage', 0)}%"
        )
        if candidate_id in top_three_ids:
            parts.append("  Base shortlist status: currently inside the scorer's top 3")
        else:
            parts.append("  Base shortlist status: currently outside the scorer's top 3")
        if product_context:
            parts.append(f"  Price: {product_context.get('price', 0)}")
            if product_context.get('best_for'):
                parts.append(f"  Best for (descriptive only): {product_context['best_for']}")
            if product_context.get('fit_summary'):
                parts.append(f"  Fit summary (descriptive only): {product_context['fit_summary']}")
            specs = product_context.get('specs', [])[:8]
            for spec in specs:
                parts.append(f"  {spec['label']}: {spec['value']}")

        feature_scores = candidate.get('scoring_breakdown', {}).get('feature_scores', {})
        top_contributors = sorted(
            feature_scores.items(),
            key=lambda item: item[1].get('contribution', 0),
            reverse=True,
        )[:5]
        if top_contributors:
            parts.append(
                "  Top scoring signals: "
                + ", ".join(
                    f"{code}={detail.get('contribution', 0):.2f}"
                    for code, detail in top_contributors
                )
            )
        capability_metrics = [
            f"capability={feature_scores.get('capability', {}).get('fit', 0):.2f}",
            f"right_sized_performance={feature_scores.get('right_sized_performance', {}).get('fit', 0):.2f}",
            f"value_for_money={feature_scores.get('value_for_money', {}).get('fit', 0):.2f}",
            f"overkill_risk={feature_scores.get('performance_overkill_risk', {}).get('fit', 0):.2f}",
            f"undershoot_risk={feature_scores.get('performance_undershoot_risk', {}).get('fit', 0):.2f}",
            f"portability={feature_scores.get('portability', {}).get('fit', 0):.2f}",
        ]
        parts.append("  Fit-to-need signals: " + ", ".join(capability_metrics))

    parts.append(
        "\nSelect the best 3 products for this customer. "
        "Use the answers to avoid overkill and to prefer the right-sized fit. "
        "Default to the scorer's current top 3 unless a nearby alternative is clearly more appropriate."
    )
    return "\n".join(parts)


def _parse_rerank_response(raw_response, candidate_ids):
    text = raw_response.strip()
    if text.startswith('```'):
        first_newline = text.index('\n')
        text = text[first_newline + 1:]
        if text.endswith('```'):
            text = text[:-3].strip()

    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        start = text.find('{')
        end = text.rfind('}')
        if start == -1 or end == -1:
            return candidate_ids[:3], {}
        try:
            payload = json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return candidate_ids[:3], {}

    ordered_ids = payload.get('ordered_product_ids', [])
    if not isinstance(ordered_ids, list):
        return candidate_ids[:3], {}

    valid_ids = []
    allowed = set(candidate_ids)
    for item in ordered_ids:
        try:
            candidate_id = int(item)
        except (TypeError, ValueError):
            continue
        if candidate_id in allowed and candidate_id not in valid_ids:
            valid_ids.append(candidate_id)

    if len(valid_ids) < 3:
        for candidate_id in candidate_ids:
            if candidate_id not in valid_ids:
                valid_ids.append(candidate_id)
            if len(valid_ids) == 3:
                break

    fit_payload = payload.get('fit_percentages', {})
    fit_percentages = {}
    if isinstance(fit_payload, dict):
        last_score = None
        for product_id in valid_ids[:3]:
            raw_value = fit_payload.get(str(product_id), fit_payload.get(product_id))
            try:
                score = int(raw_value)
            except (TypeError, ValueError):
                continue
            score = max(0, min(100, score))
            if last_score is not None and score > last_score:
                score = last_score
            fit_percentages[product_id] = score
            last_score = score

    return valid_ids[:3], fit_percentages


def _apply_conservative_rerank(ordered_ids, scored_products):
    if not scored_products:
        return ordered_ids[:3]

    base_top_three = [product['product_id'] for product in scored_products[:3]]
    base_set = set(base_top_three)
    score_by_id = {
        product['product_id']: float(product.get('final_score', 0) or 0)
        for product in scored_products
    }

    if not ordered_ids:
        return base_top_three

    top_score = float(scored_products[0].get('final_score', 0) or 0)
    third_score = float(scored_products[min(2, len(scored_products) - 1)].get('final_score', 0) or 0)
    outsider_buffer = max(
        CONSERVATIVE_RERANK_MIN_SCORE_BUFFER,
        top_score * CONSERVATIVE_RERANK_RELATIVE_SCORE_BUFFER,
    )

    eligible_outsiders = {
        product['product_id']
        for product in scored_products[3:]
        if (third_score - score_by_id.get(product['product_id'], 0.0)) <= outsider_buffer
    }

    base_preference_order = []
    for product_id in ordered_ids:
        if product_id in base_set and product_id not in base_preference_order:
            base_preference_order.append(product_id)
    for product_id in base_top_three:
        if product_id not in base_preference_order:
            base_preference_order.append(product_id)

    selected_outsiders = []
    for product_id in ordered_ids:
        if (
            product_id in eligible_outsiders
            and product_id not in selected_outsiders
            and len(selected_outsiders) < CONSERVATIVE_RERANK_MAX_OUTSIDERS
        ):
            selected_outsiders.append(product_id)

    final_ids = base_preference_order[:2]

    if selected_outsiders:
        final_ids.append(selected_outsiders[0])

    for product_id in base_preference_order:
        if product_id not in final_ids:
            final_ids.append(product_id)
        if len(final_ids) == 3:
            break

    return final_ids[:3]


def _calibrate_display_match_percentage(base_fit, rank_index, top_base_fit):
    if base_fit >= 85:
        calibrated = base_fit + 3
    elif base_fit >= 75:
        calibrated = base_fit + 6
    elif base_fit >= 65:
        calibrated = base_fit + 7
    elif base_fit >= 55:
        calibrated = base_fit + 6
    else:
        calibrated = base_fit + 4

    if rank_index == 0 and top_base_fit >= 72:
        calibrated = max(calibrated, DISPLAY_TOP_FIT_FLOOR)
    elif rank_index > 0 and top_base_fit - base_fit <= 10 and base_fit >= 60:
        calibrated = max(calibrated, DISPLAY_NEAR_TOP_FIT_FLOOR)

    return max(0, min(100, int(round(calibrated))))


def _log_llm_call(session, call_type, latency_ms):
    try:
        LLMCallLog.objects.create(
            session=session,
            call_type=call_type,
            latency_ms=int(latency_ms),
            cache_hit=False,
        )
    except Exception:
        logger.warning('Failed to log LLM call for session %s', session.session_id)


def _now_ms():
    return int(time.time() * 1000)


def _build_product_detail(product):
    """
    Build a comprehensive product detail dict from a Product model
    instance, merging manual and crawled data.
    """
    detail = {
        'product_id': product.product_id,
        'id': str(product.product_id),
        'product_name': getattr(product, 'product_name', '') or product.model,
        'model': product.model,
        'product_family': getattr(product, 'product_family', '') or product.family,
        'family': product.family,
        'brand': getattr(product, 'brand', '') or 'Lenovo',
        'model_number': getattr(product, 'model_number', '') or product.product_code,
        'product_code': product.product_code,
        'price': float(getattr(product, 'price', 0) or 0),
        'product_url': getattr(product, 'product_url', ''),
    }

    # Specs / features
    try:
        from apps.packets.models import FeatureValue
        features = FeatureValue.objects.filter(
            product=product,
        ).select_related('feature')
        detail['specs'] = [
            {
                'label': fv.feature.feature_name,
                'value': fv.value,
                'feature_name': fv.feature.feature_name,
                'feature_code': fv.feature.feature_code,
                'normalized_value': fv.normalized_value,
            }
            for fv in features
        ]
        detail.update(_derive_frontend_fields(detail['specs']))
    except Exception:
        detail['specs'] = []

    # Product content (gallery, highlights, tips)
    try:
        from apps.packets.models import ProductContent
        content = ProductContent.objects.filter(product=product).first()
        if content:
            hero_image_url = getattr(content, 'hero_image_url', '')
            gallery_urls = getattr(content, 'gallery_urls', [])
            detail['hero_image_url'] = hero_image_url
            detail['gallery_urls'] = gallery_urls
            detail['image'] = hero_image_url or ((gallery_urls or [None])[0] or '')
            detail['gallery'] = gallery_urls
            detail['fit_summary'] = _sanitize_customer_facing_text(
                getattr(content, 'fit_summary', '')
            )
            detail['key_highlights'] = _sanitize_customer_facing_list(
                getattr(content, 'key_highlights', [])
            )
            detail['best_for'] = getattr(content, 'best_for', '')
            detail['salesperson_tips'] = _sanitize_customer_facing_list(
                getattr(content, 'salesperson_tips', [])
            )
        else:
            detail.update(_empty_content())
    except (ImportError, Exception):
        detail.update(_empty_content())

    # Accessories
    try:
        from apps.packets.models import Accessory
        accessories = Accessory.objects.filter(product=product)
        detail['accessories'] = [a.accessory_name for a in accessories]
    except (ImportError, Exception):
        detail['accessories'] = []

    # Finance schemes
    try:
        from apps.packets.models import FinanceScheme
        schemes = FinanceScheme.objects.filter(product=product)
        detail['finance_schemes'] = [
            {
                'scheme_name': s.scheme_name,
                'valid_from': str(getattr(s, 'valid_from', '')),
                'valid_until': str(getattr(s, 'valid_until', '')),
            }
            for s in schemes
        ]
        detail['finance'] = [s['scheme_name'] for s in detail['finance_schemes']]
    except (ImportError, Exception):
        detail['finance_schemes'] = []
        detail['finance'] = []

    detail.setdefault('image', '')
    detail.setdefault('gallery', [])
    detail.setdefault('why_recommended', '')
    detail.setdefault('matched_benefits', [])
    detail.setdefault('trade_offs', [])
    detail.setdefault('pros', [])
    detail.setdefault('cons', [])
    detail.setdefault('implications', [])
    detail.setdefault('documents', [])

    return detail


def _empty_content():
    """Default empty content fields."""
    return {
        'hero_image_url': '',
        'gallery_urls': [],
        'image': '',
        'gallery': [],
        'fit_summary': '',
        'key_highlights': [],
        'best_for': '',
        'salesperson_tips': [],
    }


def _load_accessories(product):
    try:
        from apps.packets.models import Accessory
        return list(
            Accessory.objects.filter(product=product).values_list('accessory_name', flat=True)
        )
    except Exception:
        return []


def _load_finance(product):
    try:
        from apps.packets.models import FinanceScheme
        return list(
            FinanceScheme.objects.filter(product=product).values_list('scheme_name', flat=True)
        )
    except Exception:
        return []


def _extract_hours(value):
    text = str(value or '')
    hour_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)', text, re.IGNORECASE)
    if hour_match:
        return f"{hour_match.group(1)} hrs"

    upto_match = re.search(r'up to\s+(\d+(?:\.\d+)?)', text, re.IGNORECASE)
    if upto_match:
        return f"{upto_match.group(1)} hrs"

    return ''


def _derive_frontend_fields(specs):
    fields = {
        'chip': '',
        'memory': '',
        'storage': '',
        'display': '',
        'screen_size': '',
        'battery_life': '',
        'battery_hours': '',
        'weight': '',
        'graphics': '',
        'ports': '',
        'finish': '',
        'performance_tier': '',
        'noise_level': '',
    }

    keyword_map = {
        'chip': ['processor', 'cpu', 'chip'],
        'memory': ['memory', 'ram'],
        'storage': ['storage', 'ssd', 'hdd'],
        'display': ['display', 'screen', 'panel', 'resolution'],
        'screen_size': ['screen size', 'display size', 'size'],
        'battery_life': ['battery'],
        'weight': ['weight'],
        'graphics': ['graphics', 'graphic card', 'gpu'],
        'ports': ['port', 'connectivity'],
        'finish': ['color', 'finish'],
        'performance_tier': ['performance tier'],
        'noise_level': ['noise', 'acoustic', 'fan'],
    }

    for spec in specs:
        label = str(spec.get('label') or spec.get('feature_name') or '').strip()
        value = str(spec.get('value', '')).strip()
        key = label.lower()

        for field_name, keywords in keyword_map.items():
            if fields[field_name]:
                continue
            if any(keyword in key for keyword in keywords):
                fields[field_name] = value

        if not fields['screen_size']:
            size_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:\"|inch)', value.lower())
            if size_match:
                fields['screen_size'] = f'{size_match.group(1)}"'

    if fields['display'] and not fields['screen_size']:
        size_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:\"|inch)', fields['display'].lower())
        if size_match:
            fields['screen_size'] = f'{size_match.group(1)}"'

    if fields['battery_life'] and not fields['battery_hours']:
        fields['battery_hours'] = _extract_hours(fields['battery_life'])

    return fields


def _build_implications(matched_benefits, trade_offs):
    implications = []
    for item in matched_benefits[:2]:
        if item:
            implications.append(item)
    for item in trade_offs[:2]:
        if item:
            implications.append(item)
    return implications[:4]


def _sanitize_customer_facing_text(value):
    text = str(value or '').strip()
    if not text:
        return ''

    for pattern in CUSTOMER_FIT_FRAGMENT_PATTERNS:
        text = pattern.sub('', text)

    text = re.sub(r'\(\s*\)', '', text)
    text = re.sub(r'\s+([,.;:!?])', r'\1', text)
    text = re.sub(r'([,;:])\1+', r'\1', text)
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip(' ,;:-')


def _sanitize_customer_facing_list(values):
    if isinstance(values, str):
        values = [values]

    sanitized = []
    for value in values or []:
        cleaned = _sanitize_customer_facing_text(value)
        if cleaned:
            sanitized.append(cleaned)
    return sanitized


def _get_stub_product_detail(product_id):
    """
    Return stub product detail when packets models are not yet
    available. Allows frontend development to proceed.
    """
    stub_products = {
        1001: {
            'product_id': 1001,
            'product_name': 'Product Alpha',
            'product_family': 'family_a',
            'brand': 'Brand A',
            'model_number': 'ALPHA-001',
            'price': 49999,
            'product_url': '',
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '49,999', 'normalized_value': 0.8},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'High', 'normalized_value': 0.7},
                {'feature_name': 'Battery Life', 'feature_code': 'battery_life', 'value': '12 hours', 'normalized_value': 0.9},
            ],
            'hero_image_url': '',
            'gallery_urls': [],
            'fit_summary': 'Great all-round product with excellent battery life.',
            'key_highlights': ['Long battery life', 'Lightweight', 'Good performance'],
            'best_for': 'Professionals on the go',
            'salesperson_tips': 'Highlight the battery life and portability.',
            'accessories': [],
            'finance_schemes': [],
        },
        1002: {
            'product_id': 1002,
            'product_name': 'Product Beta',
            'product_family': 'family_a',
            'brand': 'Brand A',
            'model_number': 'BETA-001',
            'price': 69999,
            'product_url': '',
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '69,999', 'normalized_value': 0.6},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'Very High', 'normalized_value': 0.9},
                {'feature_name': 'Display', 'feature_code': 'display_quality', 'value': '4K OLED', 'normalized_value': 0.9},
            ],
            'hero_image_url': '',
            'gallery_urls': [],
            'fit_summary': 'Premium performance with stunning display.',
            'key_highlights': ['Top-tier performance', '4K display', 'Premium build'],
            'best_for': 'Power users and creatives',
            'salesperson_tips': 'Emphasize the display quality and processing power.',
            'accessories': [],
            'finance_schemes': [],
        },
        1003: {
            'product_id': 1003,
            'product_name': 'Product Gamma',
            'product_family': 'family_b',
            'brand': 'Brand B',
            'model_number': 'GAMMA-001',
            'price': 34999,
            'product_url': '',
            'specs': [
                {'feature_name': 'Price', 'feature_code': 'price', 'value': '34,999', 'normalized_value': 0.9},
                {'feature_name': 'Performance', 'feature_code': 'performance', 'value': 'Medium', 'normalized_value': 0.5},
                {'feature_name': 'Portability', 'feature_code': 'portability', 'value': 'Ultralight', 'normalized_value': 0.9},
            ],
            'hero_image_url': '',
            'gallery_urls': [],
            'fit_summary': 'Best value with excellent portability.',
            'key_highlights': ['Best price', 'Ultra-portable', 'Good battery'],
            'best_for': 'Budget-conscious buyers who travel',
            'salesperson_tips': 'Lead with the price point and weight.',
            'accessories': [],
            'finance_schemes': [],
        },
    }

    product = stub_products.get(product_id)
    if product:
        return product

    # Generic fallback for unknown product IDs
    return {
        'product_id': product_id,
        'product_name': f'Product {product_id}',
        'product_family': 'unknown',
        'brand': 'Unknown',
        'model_number': '',
        'price': None,
        'product_url': '',
        'specs': [],
        'hero_image_url': '',
        'gallery_urls': [],
        'fit_summary': '',
        'key_highlights': [],
        'best_for': '',
        'salesperson_tips': '',
        'accessories': [],
        'finance_schemes': [],
    }
