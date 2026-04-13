import logging

from rest_framework import status
from apps.common.permissions import CsrfExemptSessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CustomerSession
from .serializers import (
    CustomerSessionCreateSerializer,
    CustomerSessionSerializer,
    CustomerSessionUpdateSerializer,
)

try:
    from apps.packets.models import Packet
except (ImportError, Exception):
    Packet = None

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def create_session(request):
    """
    POST /api/sessions/
    Create a new customer session.
    Extracts cmid and user_id from the authenticated user.
    Auto-generates conversation_id (UUID default on model).
    """
    packet_id = request.data.get('packet_id')
    if not packet_id and Packet is not None:
        packet = (
            Packet.objects.filter(cmid=request.user.cmid, launch_status='active')
            .order_by('packet_id')
            .first()
        )
        packet_id = packet.packet_id if packet else None

    serializer = CustomerSessionCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(
        cmid=request.user.cmid,
        user_id=request.user.id,
        packet_id=packet_id,
    )
    logger.info(
        'Session %s created by user %s (cmid=%s)',
        serializer.instance.session_id,
        request.user.id,
        request.user.cmid,
    )
    # Return full representation with answers (empty list for new session)
    output = CustomerSessionSerializer(serializer.instance).data
    return Response(output, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    """
    GET  /api/sessions/<session_id>/  — Retrieve session with answers.
    PATCH /api/sessions/<session_id>/ — Update mutable session fields.
    """
    try:
        session = CustomerSession.objects.get(pk=session_id)
    except CustomerSession.DoesNotExist:
        return Response(
            {'detail': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == 'GET':
        serializer = CustomerSessionSerializer(session)
        return Response(serializer.data)

    # PATCH
    serializer = CustomerSessionUpdateSerializer(
        session, data=request.data, partial=True,
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    logger.info(
        'Session %s updated by user %s',
        session_id,
        request.user.id,
    )
    output = CustomerSessionSerializer(session).data
    return Response(output)
