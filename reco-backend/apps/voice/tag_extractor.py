"""
Tag extraction service for Bsharp Reco.
Uses Amazon Bedrock (Claude) to extract customer preference tags
from voice transcript text.
"""
import json
import logging

from apps.common.bedrock_client import BedrockClient

logger = logging.getLogger(__name__)


def extract_tags(text: str) -> list:
    """
    Extract customer preference tags from transcript text using Bedrock (Claude).

    Args:
        text: Transcript or free-form text describing customer needs.

    Returns:
        List of tag dicts, each with keys:
            - tag (str): short descriptive label (2-4 words)
            - category (str): one of usage, portability, screen-size, priority,
              features, budget, brand-preference, performance
            - confidence (float): 0.0 - 1.0
    """
    if not text or not text.strip():
        return []

    client = BedrockClient()

    prompt = (
        'Extract customer preference tags from this retail conversation transcript.\n'
        'Return a JSON array of tags. Each tag should have:\n'
        '- "tag": short descriptive label (2-4 words)\n'
        '- "category": one of: usage, portability, screen-size, priority, '
        'features, budget, brand-preference, performance\n'
        '- "confidence": float between 0 and 1\n\n'
        'Only extract preferences that are clearly stated or strongly implied.\n\n'
        f'Transcript: "{text}"\n\n'
        'Return ONLY the JSON array, no other text.'
    )

    try:
        response = client.invoke(prompt, max_tokens=1024)
        # Parse JSON from response
        tags = json.loads(response)
        if isinstance(tags, list):
            return tags
        return []
    except (json.JSONDecodeError, Exception) as e:
        logger.warning('Tag extraction failed: %s', str(e))
        return []
