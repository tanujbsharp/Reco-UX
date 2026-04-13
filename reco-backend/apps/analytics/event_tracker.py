"""
Convenience helper for recording interaction events from anywhere in the
codebase.  Keeps the import path short and provides a fire-and-forget API.

Usage:
    from apps.analytics.event_tracker import track_event
    track_event(session_id=42, cmid=7, outlet_id=3, user_id=10,
                event_type='recommendation_shown',
                event_data={'product_ids': [1, 2, 3]})
"""
import logging

from apps.analytics.models import InteractionEvent

logger = logging.getLogger(__name__)


def track_event(session_id, cmid, outlet_id, user_id, event_type, event_data=None):
    """
    Create an InteractionEvent row.

    Args:
        session_id: FK to CustomerSession (may be None for pre-session events).
        cmid: Tenant identifier.
        outlet_id: Retail outlet id (may be None).
        user_id: Staff user id (may be None).
        event_type: Short label — e.g. 'session_start', 'answer_submitted',
                     'recommendation_shown', 'product_compared', 'feedback_given'.
        event_data: Optional JSON-serialisable dict with extra context.

    Returns:
        The created InteractionEvent instance, or None on failure.
    """
    try:
        event = InteractionEvent.objects.create(
            session_id=session_id,
            cmid=cmid,
            outlet_id=outlet_id,
            user_id=user_id,
            event_type=event_type,
            event_data=event_data,
        )

        # Index to OpenSearch journey trails (best-effort)
        try:
            from apps.common.opensearch_client import OpenSearchClient
            from apps.common.opensearch_indexes import INDEX_JOURNEY_TRAILS

            session = event.session
            client = OpenSearchClient()
            client.index_document(INDEX_JOURNEY_TRAILS, {
                'conversation_id': str(session.conversation_id) if session else None,
                'timestamp': event.created_at.isoformat(),
                'event_type': event_type,
                'event_data': event_data,
                'cmid': cmid,
                'outlet_id': outlet_id,
            })
        except Exception:
            pass  # OpenSearch indexing is best-effort

        return event
    except Exception as exc:
        logger.error(
            'Failed to track event %s for session %s: %s',
            event_type, session_id, exc,
        )
        return None
