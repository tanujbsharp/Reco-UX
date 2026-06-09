"""
Tag extraction service for Bsharp Reco.
Uses Amazon Bedrock (Claude) to extract customer preference tags
and a likely user archetype from voice or text discovery input.
"""
import json
import logging

from apps.common.bedrock_client import BedrockClient

logger = logging.getLogger(__name__)

SUPPORTED_ARCHETYPES = [
    'student',
    'professional',
    'coder',
    'gamer',
    'creator',
    'business-owner',
    'remote-worker',
    'traveler',
    'parent',
    'teacher',
    'casual-user',
    'power-user',
]


def _normalize_tag_payload(tags) -> list[dict]:
    normalized = []
    if not isinstance(tags, list):
        return normalized

    for raw_tag in tags:
        if not isinstance(raw_tag, dict):
            continue

        label = str(raw_tag.get('tag', '')).strip()
        category = str(raw_tag.get('category', '')).strip()
        confidence = raw_tag.get('confidence', 0.0)

        if not label or not category:
            continue

        try:
            confidence = max(0.0, min(1.0, float(confidence)))
        except (TypeError, ValueError):
            confidence = 0.0

        normalized.append({
            'tag': label,
            'category': category,
            'confidence': confidence,
        })

    return normalized


def _normalize_archetype_payload(archetype) -> dict | None:
    if not isinstance(archetype, dict):
        return None

    label = str(archetype.get('label', '')).strip().lower()
    if label not in SUPPORTED_ARCHETYPES:
        return None

    confidence = archetype.get('confidence', 0.0)
    try:
        confidence = max(0.0, min(1.0, float(confidence)))
    except (TypeError, ValueError):
        confidence = 0.0

    if confidence < 0.35:
        return None

    return {
        'label': label,
        'confidence': confidence,
    }


def analyze_customer_intent(text: str) -> dict:
    """
    Extract structured discovery signals from free-form customer text.

    Returns:
        {
            "tags": [...],
            "archetype": {"label": "...", "confidence": 0.0-1.0} | None
        }
    """
    if not text or not text.strip():
        return {
            'tags': [],
            'archetype': None,
        }

    client = BedrockClient()

    prompt = (
        'Analyze this retail laptop discovery input.\n'
        'Return ONLY valid JSON with this exact shape:\n'
        '{\n'
        '  "tags": [\n'
        '    {"tag": "string", "category": "usage|portability|screen-size|priority|features|budget|brand-preference|performance", "confidence": 0.0}\n'
        '  ],\n'
        '  "archetype": {"label": "student|professional|coder|gamer|creator|business-owner|remote-worker|traveler|parent|teacher|casual-user|power-user", "confidence": 0.0} | null\n'
        '}\n\n'
        'Rules:\n'
        '- Tags should capture only clear or strongly implied customer needs.\n'
        '- The archetype should be present only when the input clearly signals one likely primary profile.\n'
        '- If the text is ambiguous, set archetype to null.\n'
        '- Keep tag labels short, natural, and specific.\n'
        f'Customer input: "{text}"'
    )

    try:
        response = client.invoke(prompt, max_tokens=1024)
        payload = json.loads(response)
        if isinstance(payload, list):
            return {
                'tags': _normalize_tag_payload(payload),
                'archetype': None,
            }

        if not isinstance(payload, dict):
            return {'tags': [], 'archetype': None}

        return {
            'tags': _normalize_tag_payload(payload.get('tags', [])),
            'archetype': _normalize_archetype_payload(payload.get('archetype')),
        }
    except (json.JSONDecodeError, Exception) as e:
        logger.warning('Intent analysis failed: %s', str(e))
        return {
            'tags': [],
            'archetype': None,
        }


def extract_tags(text: str) -> list:
    """
    Backward-compatible wrapper for callers that only need tags.
    """
    return analyze_customer_intent(text).get('tags', [])
