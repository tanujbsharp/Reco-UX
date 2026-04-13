"""
Analytics dashboard API views.

Endpoints:
  GET /api/analytics/overview?period=7d|30d|90d

Returns aggregate metrics scoped by the caller's role:
  - Admin (user_role=1 / rid=1):  all outlets for their tenant
  - Staff  (user_role=2 / rid=2): own outlet only
"""
import logging
from datetime import timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.analytics.models import InteractionEvent
from apps.common.permissions import IsActiveUser
from apps.sessions_app.models import CustomerSession

logger = logging.getLogger(__name__)

PERIOD_MAP = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
}


@api_view(['GET'])
@permission_classes([IsActiveUser])
def analytics_overview(request):
    """
    GET /api/analytics/overview?period=7d

    Query params:
        period — one of 7d, 30d, 90d (default 30d)

    Response payload:
        total_sessions, completed_sessions, avg_feedback_rating,
        top_recommended_products, events_by_type
    """
    period_key = request.query_params.get('period', '30d')
    days = PERIOD_MAP.get(period_key, 30)
    cutoff = timezone.now() - timedelta(days=days)

    cmid = request.user.cmid
    user = request.user
    is_admin = user.user_role == 1

    # ----- Session metrics -----
    session_qs = CustomerSession.objects.filter(cmid=cmid, created_at__gte=cutoff)
    event_qs = InteractionEvent.objects.filter(cmid=cmid, created_at__gte=cutoff)

    if not is_admin:
        # Staff can only see their own outlet's data.
        # We use the user_id field on the session to limit scope.
        session_qs = session_qs.filter(user_id=user.id)
        event_qs = event_qs.filter(user_id=user.id)

    total_sessions = session_qs.count()
    completed_sessions = session_qs.filter(status='completed').count()
    avg_feedback = session_qs.filter(
        recommendation_feedback_stars__isnull=False,
    ).aggregate(avg=Avg('recommendation_feedback_stars'))['avg']

    # ----- Top recommended products -----
    reco_events = event_qs.filter(event_type='recommendation_shown')
    product_counts = {}
    for evt in reco_events.only('event_data').iterator():
        if evt.event_data and isinstance(evt.event_data, dict):
            for pid in evt.event_data.get('product_ids', []):
                product_counts[pid] = product_counts.get(pid, 0) + 1

    top_products = sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:10]

    # ----- Events by type -----
    events_by_type = dict(
        event_qs.values_list('event_type').annotate(cnt=Count('event_id')).values_list('event_type', 'cnt')
    )

    return Response({
        'period': period_key,
        'total_sessions': total_sessions,
        'completed_sessions': completed_sessions,
        'avg_feedback_rating': round(avg_feedback, 2) if avg_feedback else None,
        'top_recommended_products': [
            {'product_id': pid, 'recommendation_count': cnt}
            for pid, cnt in top_products
        ],
        'events_by_type': events_by_type,
    })
