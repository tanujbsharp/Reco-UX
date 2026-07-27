"""
Explanation Engine for Bsharp Reco.

For each recommended product in the top 3, calls Amazon Bedrock
(Claude) to generate a human-readable explanation of why the product
was recommended based on the customer's preferences and the
product's features.

Output per product:
    - whyRecommended   (str)
    - fitSummary       (str)
    - fitLabel         (str)
    - keyHighlights    (list[str])
    - matchedBenefits  (list[str])
    - tradeOffs        (list[str])
    - pros             (list[str])
    - cons             (list[str])

Results are cached in RecommendationResult.explanation_text as JSON.
"""
import json
import logging
import time

from apps.common.bedrock_client import BedrockClient
from apps.questions.models import LLMCallLog
from apps.sessions_app.models import SessionAnswer

logger = logging.getLogger(__name__)

EXPLANATION_SYSTEM_PROMPT = (
    "You are a retail product recommendation assistant for Bsharp Reco. "
    "Your task is to explain why a specific product was recommended to a "
    "customer based on their stated preferences, voice tags, and the "
    "product's features and scoring breakdown.\n\n"
    "Be helpful and honest. Mention both strengths and trade-offs.\n\n"
    "STYLE — TERSE PHRASES, NOT PROSE: every field is read at a glance on a "
    "retail screen. Write like spec-sheet callouts a salesperson would say, "
    "not paragraphs. No filler ('this laptop offers', 'you will enjoy', "
    "'making it ideal for'), no trailing punctuation on list items.\n\n"
    "Do not mention internal scores, weights, percentages, decimal fit values, "
    "or scoring math in any customer-facing field. Convert those signals into "
    "plain natural language instead. Never mention price, cost, affordability, "
    "or value-for-money in any field — pricing is handled elsewhere in the store.\n\n"
    "You MUST respond with ONLY valid JSON matching this schema:\n"
    "{\n"
    '  "whyRecommended": "string — ONE short sentence, max 15 words, naming the customer\'s need it solves",\n'
    '  "fitSummary": "string — one terse phrase, max 10 words (e.g. \'Strong coding power with touch for notes\')",\n'
    '  "fitLabel": "string — 3-6 word customer-context badge for the recommendation card",\n'
    '  "keyHighlights": ["string — terse 2-4 word chip label (e.g. \'16-inch OLED display\', \'All-day battery\'), NEVER a full sentence", ...],\n'
    '  "matchedBenefits": ["string — 3-6 word phrase tying a feature to their need (e.g. \'Runs Valorant and GTA smoothly\')", ...],\n'
    '  "tradeOffs": ["string — 3-6 word honest caveat (e.g. \'Heavier than typical ultrabooks\')", ...],\n'
    '  "pros": ["string — 2-5 word advantage", ...],\n'
    '  "cons": ["string — 2-5 word limitation", ...]\n'
    "}\n\n"
    "keyHighlights are rendered as small UI chips: each must be a punchy phrase of at most 4 words "
    "(no verbs needed, no trailing punctuation). "
    "The fitLabel must describe why this product fits THIS customer, not the product's generic catalog positioning. "
    "For example, prefer labels like 'Student coding and AI coursework' or 'Parent-friendly streaming and browsing' "
    "over generic labels like 'Premium video watching' when that is not the customer's main use case.\n\n"
    "Do NOT include any text outside the JSON object."
)


def generate_explanation(session, product_result, answers=None):
    """
    Generate an LLM explanation for a single recommended product.

    Args:
        session: CustomerSession instance.
        product_result: dict from RecommendationScorer output with keys
            product_id, product_name, final_score, match_percentage,
            scoring_breakdown.
        answers: Optional pre-loaded list of SessionAnswer instances.

    Returns:
        dict: Explanation object with whyRecommended, fitSummary, etc.
              On failure, returns a fallback explanation.
    """
    if answers is None:
        answers = list(
            SessionAnswer.objects.filter(session=session).order_by('created_at')
        )

    prompt = _build_explanation_prompt(product_result, answers)

    client = BedrockClient()
    start_ms = _now_ms()

    try:
        raw_response = client.invoke(
            prompt=prompt,
            system_prompt=EXPLANATION_SYSTEM_PROMPT,
            temperature=0.5,
            max_tokens=1024,
        )
        latency = _now_ms() - start_ms

        explanation = _parse_explanation_response(raw_response, product_result)

        # Log the LLM call
        _log_llm_call(session, 'explanation', latency)

        return explanation

    except Exception as e:
        latency = _now_ms() - start_ms
        _log_llm_call(session, 'explanation', latency)
        logger.warning(
            'Explanation generation failed for product %s: %s',
            product_result.get('product_id'), e,
        )
        return _fallback_explanation(product_result)


def generate_explanations_batch(session, product_results, answers=None):
    """
    Generate explanations for all top-N recommended products.

    Args:
        session: CustomerSession instance.
        product_results: list of dicts from RecommendationScorer.
        answers: Optional pre-loaded list of SessionAnswer instances.

    Returns:
        dict: Maps product_id -> explanation dict.
    """
    if answers is None:
        answers = list(
            SessionAnswer.objects.filter(session=session).order_by('created_at')
        )

    explanations = {}
    for product_result in product_results:
        pid = product_result.get('product_id')
        explanations[pid] = generate_explanation(
            session, product_result, answers=answers,
        )

    return explanations


def _build_explanation_prompt(product_result, answers):
    """Build the user prompt for Bedrock explanation call."""
    parts = []

    parts.append("Explain why this product was recommended to the customer.\n")

    # Product info
    parts.append(f"PRODUCT: {product_result.get('product_name', 'Unknown')}")
    parts.append(f"Product ID: {product_result.get('product_id')}")
    parts.append(f"Match: {product_result.get('match_percentage', 0)}%")
    parts.append(f"Score: {product_result.get('final_score', 0):.2f}")

    # Scoring breakdown
    breakdown = product_result.get('scoring_breakdown', {})
    feature_scores = breakdown.get('feature_scores', {})
    if feature_scores:
        parts.append("\nFEATURE SCORES:")
        for code, detail in feature_scores.items():
            parts.append(
                f"  {code}: weight={detail.get('weight', 0):.2f}, "
                f"fit={detail.get('fit', 0):.2f}, "
                f"contribution={detail.get('contribution', 0):.2f}"
            )

    # Customer preferences (from answers)
    if answers:
        parts.append("\nCUSTOMER PREFERENCES:")
        voice_answers = [a for a in answers if a.from_voice]
        if voice_answers:
            parts.append("  Voice inputs:")
            for va in voice_answers:
                parts.append(f"    - \"{va.answer_value}\"")

        qa_answers = [a for a in answers if not a.from_voice]
        if qa_answers:
            parts.append("  Questions & Answers:")
            for qa in qa_answers:
                parts.append(f"    Q: {qa.question_text}")
                parts.append(f"    A: {qa.answer_value}")

    parts.append("\nGenerate the explanation as JSON.")
    return "\n".join(parts)


def _parse_explanation_response(raw_response, product_result):
    """
    Parse the Bedrock response into a structured explanation dict.
    """
    text = raw_response.strip()

    # Strip markdown code fences if present
    if text.startswith('```'):
        first_newline = text.index('\n')
        text = text[first_newline + 1:]
        if text.endswith('```'):
            text = text[:-3].strip()

    try:
        explanation = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from response
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try:
                explanation = json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                logger.warning(
                    'Failed to parse explanation response for product %s',
                    product_result.get('product_id'),
                )
                return _fallback_explanation(product_result)
        else:
            return _fallback_explanation(product_result)

    # Ensure all expected keys exist
    defaults = {
        'whyRecommended': '',
        'fitSummary': '',
        'fitLabel': '',
        'keyHighlights': [],
        'matchedBenefits': [],
        'tradeOffs': [],
        'pros': [],
        'cons': [],
    }
    for key, default in defaults.items():
        explanation.setdefault(key, default)

    return explanation


def _fallback_explanation(product_result):
    """
    Return a minimal explanation when Bedrock is unavailable or
    parsing fails.
    """
    name = product_result.get('product_name', 'This product')

    return {
        'whyRecommended': (
            f'{name} was recommended because it aligns well with the needs '
            'you described.'
        ),
        'fitSummary': 'A strong overall fit based on the preferences you shared.',
        'fitLabel': 'Recommended for your needs',
        'keyHighlights': [
            'Matches your stated requirements',
            'Scored well across key features',
        ],
        'matchedBenefits': [],
        'tradeOffs': [],
        'pros': ['Good overall fit with your needs'],
        'cons': [],
    }


def _log_llm_call(session, call_type, latency_ms):
    """Log the LLM call for observability and cost tracking."""
    try:
        LLMCallLog.objects.create(
            session=session,
            call_type=call_type,
            latency_ms=int(latency_ms),
            cache_hit=False,
        )
    except Exception:
        logger.warning(
            'Failed to log LLM call for session %s', session.session_id,
        )


def _now_ms():
    """Current time in milliseconds."""
    return int(time.time() * 1000)
