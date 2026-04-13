"""
Feedback Pattern Analyzer for Bsharp Reco.

Nightly batch job that aggregates feedback data to detect recurring
patterns in recommendation quality.

Pipeline:
    1. Group feedback by cmid + packet_id + input_profile_hash + product_combination_hash
    2. For groups with >= 3 sessions: calculate avg_rating
    3. If avg < 2.5: flag as poor pattern
    4. If avg > 4.0: flag as strong pattern
    5. Upsert into FeedbackPattern table

Used by: feedback.tasks (Django Q scheduled task)
"""
import hashlib
import json
import logging
from collections import defaultdict

from django.db.models import Avg, Count

from apps.feedback.models import Feedback, FeedbackPattern

logger = logging.getLogger(__name__)

MIN_SESSIONS_FOR_PATTERN = 3
POOR_THRESHOLD = 2.5
STRONG_THRESHOLD = 4.0


def _compute_input_profile_hash(customer_answers):
    """
    Create a deterministic hash of the customer's answer profile.

    Normalizes the answers (sorted keys) so that identical answer
    sets always produce the same hash, regardless of ordering.
    """
    if not customer_answers:
        return hashlib.sha256(b'empty').hexdigest()[:64]

    # Normalize: list of (question, answer) pairs sorted by question
    normalized = []
    for ans in customer_answers:
        q = ans.get('question_text', '') if isinstance(ans, dict) else ''
        a = ans.get('answer_value', '') if isinstance(ans, dict) else ''
        normalized.append((q, a))
    normalized.sort()

    raw = json.dumps(normalized, sort_keys=True).encode('utf-8')
    return hashlib.sha256(raw).hexdigest()[:64]


def _compute_product_combination_hash(recommended_products):
    """
    Create a deterministic hash of the recommended product combination.

    Sorts product IDs so that the same set of recommendations always
    produces the same hash.
    """
    if not recommended_products:
        return hashlib.sha256(b'empty').hexdigest()[:64]

    product_ids = sorted(
        p.get('product_id', 0) if isinstance(p, dict) else 0
        for p in recommended_products
    )

    raw = json.dumps(product_ids).encode('utf-8')
    return hashlib.sha256(raw).hexdigest()[:64]


def analyze_patterns():
    """
    Main entry point for the nightly pattern analysis batch job.

    Groups all feedback records and identifies strong/poor patterns
    where enough data exists (>= MIN_SESSIONS_FOR_PATTERN sessions).

    Returns:
        dict: Summary of the analysis run with counts.
    """
    logger.info('Starting feedback pattern analysis...')

    # Build grouping keys for every feedback record
    groups = defaultdict(list)
    feedback_qs = Feedback.objects.select_related('session').all()

    for fb in feedback_qs:
        packet_id = fb.session.packet_id or 0
        input_hash = _compute_input_profile_hash(fb.customer_answers)
        product_hash = _compute_product_combination_hash(fb.recommended_products)

        key = (fb.cmid, packet_id, input_hash, product_hash)
        groups[key].append(fb)

    patterns_created = 0
    patterns_updated = 0
    poor_patterns = 0
    strong_patterns = 0

    for (cmid, packet_id, input_hash, product_hash), feedbacks in groups.items():
        session_count = len(feedbacks)

        if session_count < MIN_SESSIONS_FOR_PATTERN:
            continue

        avg_rating = sum(fb.rating for fb in feedbacks) / session_count

        # Determine pattern quality
        if avg_rating < POOR_THRESHOLD:
            quality = 'poor'
            poor_patterns += 1
        elif avg_rating > STRONG_THRESHOLD:
            quality = 'strong'
            strong_patterns += 1
        else:
            quality = 'neutral'

        pattern_data = {
            'quality': quality,
            'avg_rating': round(avg_rating, 2),
            'session_count': session_count,
            'sample_products': feedbacks[0].recommended_products if feedbacks else [],
            'feedback_ids': [fb.feedback_id for fb in feedbacks],
        }

        # Upsert pattern
        pattern, created = FeedbackPattern.objects.update_or_create(
            cmid=cmid,
            packet_id=packet_id,
            input_profile_hash=input_hash,
            product_combination_hash=product_hash,
            defaults={
                'avg_rating': round(avg_rating, 2),
                'session_count': session_count,
                'pattern_data': pattern_data,
            },
        )

        if created:
            patterns_created += 1
        else:
            patterns_updated += 1

    summary = {
        'total_groups': len(groups),
        'patterns_created': patterns_created,
        'patterns_updated': patterns_updated,
        'poor_patterns': poor_patterns,
        'strong_patterns': strong_patterns,
    }

    logger.info('Pattern analysis complete: %s', summary)
    return summary
