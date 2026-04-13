"""
Lead capture, handoff, and share views for Bsharp Reco.

Endpoints:
    POST /api/handoff/         — Create a lead + handoff request.
    GET  /api/handoff/pending  — List pending handoffs for user's outlet.
    POST /api/share/email      — Send recommendations via SES email.
    POST /api/share/whatsapp   — Returns 501 Not Implemented (future).
"""
import logging

from rest_framework import status
from apps.common.permissions import CsrfExemptSessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.sessions_app.models import CustomerSession
from apps.leads.models import Lead, HandoffRequest, ShareEvent
from apps.leads.email_service import send_recommendation_email

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Handoff endpoints
# ---------------------------------------------------------------------------

@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def create_handoff(request):
    """
    POST /api/handoff/

    Request body:
        {
            "session_id": 1,
            "product_id": 123,
            "discussion_note": "Customer interested in premium variant."
        }

    Creates a Lead (if none exists for this session) and a
    HandoffRequest for the specified product.
    """
    session_id = request.data.get('session_id')
    product_id = request.data.get('product_id')
    discussion_note = request.data.get('discussion_note', '')

    # --- Validation ---
    if not session_id:
        return Response(
            {'detail': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not product_id:
        return Response(
            {'detail': 'product_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --- Load session ---
    try:
        session = CustomerSession.objects.get(pk=session_id)
    except CustomerSession.DoesNotExist:
        return Response(
            {'detail': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # --- Ensure customer profile exists ---
    try:
        customer = session.customer
    except Exception:
        return Response(
            {'detail': 'No customer profile linked to this session.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --- Create or get lead ---
    lead, lead_created = Lead.objects.get_or_create(
        session=session,
        customer=customer,
        defaults={
            'cmid': session.cmid,
            'outlet_id': session.outlet_id,
            'lead_status': 'new',
            'selected_product_id': product_id,
        },
    )

    if not lead_created and lead.selected_product_id != product_id:
        lead.selected_product_id = product_id
        lead.save(update_fields=['selected_product_id'])

    # --- Create handoff request ---
    handoff = HandoffRequest.objects.create(
        lead=lead,
        outlet_id=session.outlet_id or 0,
        product_id=product_id,
        status='pending',
        discussion_note=discussion_note,
    )

    logger.info(
        'Handoff %s created for session %s, product %s',
        handoff.handoff_id, session_id, product_id,
    )

    return Response({
        'lead_id': lead.lead_id,
        'handoff_id': handoff.handoff_id,
        'status': 'pending',
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def pending_handoffs(request):
    """
    GET /api/handoff/pending

    Returns pending handoff requests for the authenticated user's outlet.
    Outlet is inferred from the user's most recent session, or from a
    query parameter.
    """
    outlet_id = request.query_params.get('outlet_id')

    if not outlet_id:
        # Try to infer outlet from user's sessions
        latest_session = (
            CustomerSession.objects.filter(user_id=request.user.pk)
            .order_by('-created_at')
            .first()
        )
        if latest_session and latest_session.outlet_id:
            outlet_id = latest_session.outlet_id
        else:
            return Response(
                {'detail': 'outlet_id is required (could not infer from user sessions).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

    handoffs = (
        HandoffRequest.objects.filter(
            outlet_id=outlet_id,
            status='pending',
        )
        .select_related('lead', 'lead__customer', 'lead__session')
        .order_by('-created_at')
    )

    results = []
    for h in handoffs:
        results.append({
            'handoff_id': h.handoff_id,
            'lead_id': h.lead_id,
            'product_id': h.product_id,
            'status': h.status,
            'discussion_note': h.discussion_note,
            'customer_name': getattr(h.lead.customer, 'name', ''),
            'customer_phone': getattr(h.lead.customer, 'phone', ''),
            'session_id': h.lead.session_id,
            'created_at': h.created_at.isoformat(),
        })

    return Response({
        'outlet_id': int(outlet_id),
        'count': len(results),
        'handoffs': results,
    })


# ---------------------------------------------------------------------------
# Share endpoints
# ---------------------------------------------------------------------------

@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def share_email(request):
    """
    POST /api/share/email

    Request body:
        {
            "session_id": 1,
            "recipient_email": "customer@email.com"
        }

    Sends the session's top 3 recommendations via SES email.
    """
    session_id = request.data.get('session_id')
    recipient_email = request.data.get('recipient_email', '').strip()

    # --- Validation ---
    if not session_id:
        return Response(
            {'detail': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not recipient_email:
        return Response(
            {'detail': 'recipient_email is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # --- Load session ---
    try:
        session = CustomerSession.objects.get(pk=session_id)
    except CustomerSession.DoesNotExist:
        return Response(
            {'detail': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # --- Send email ---
    try:
        message_id = send_recommendation_email(session, recipient_email)
    except ValueError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        logger.exception('Email share failed for session %s', session_id)
        return Response(
            {'detail': f'Email sending failed: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # --- Record share event ---
    share = ShareEvent.objects.create(
        session=session,
        share_method='email',
        recipient=recipient_email,
        ses_message_id=message_id,
    )

    return Response({
        'share_id': share.share_id,
        'session_id': session_id,
        'recipient_email': recipient_email,
        'ses_message_id': message_id,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def share_whatsapp(request):
    """
    POST /api/share/whatsapp

    WhatsApp sharing is not implemented in the MVP.
    Returns 501 Not Implemented.
    """
    return Response(
        {'detail': 'WhatsApp sharing is not implemented in the MVP.'},
        status=status.HTTP_501_NOT_IMPLEMENTED,
    )
