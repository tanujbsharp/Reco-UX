"""
Packet Builder API views.

Endpoints:
  POST /api/packets/{id}/upload-products/ — bulk Excel product import (brand admin only)
  GET  /api/packets/{id}/                 — full packet configuration
  GET  /api/packets/                      — list packets for the tenant
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from apps.common.permissions import IsBrandAdmin, IsActiveUser
from apps.packets.excel_importer import import_products_from_excel
from apps.packets.models import Packet
from apps.packets.serializers import PacketDetailSerializer, PacketListSerializer

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsBrandAdmin])
@parser_classes([MultiPartParser])
def upload_products(request, packet_id):
    """
    POST /api/packets/{packet_id}/upload-products/

    Upload an .xlsx file to bulk-create or update products and feature
    values for the given packet.  Brand admin only.
    """
    try:
        packet = Packet.objects.get(packet_id=packet_id, cmid=request.user.cmid)
    except Packet.DoesNotExist:
        return Response(
            {'error': 'Packet not found or access denied'},
            status=status.HTTP_404_NOT_FOUND,
        )

    file_obj = request.FILES.get('file')
    if not file_obj:
        return Response(
            {'error': 'No file provided. Send an .xlsx file as "file" in multipart form.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not file_obj.name.endswith('.xlsx'):
        return Response(
            {'error': 'Only .xlsx files are accepted.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    result = import_products_from_excel(file_obj, packet)
    return Response(result, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsActiveUser])
def packet_detail(request, packet_id):
    """
    GET /api/packets/{packet_id}/

    Returns the full packet configuration including products, features,
    dimensions, benefit mappings, and scoring configs.
    """
    try:
        packet = Packet.objects.get(packet_id=packet_id, cmid=request.user.cmid)
    except Packet.DoesNotExist:
        return Response(
            {'error': 'Packet not found or access denied'},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = PacketDetailSerializer(packet)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsActiveUser])
def packet_list(request):
    """
    GET /api/packets/

    Returns all packets for the authenticated user's tenant.
    """
    packets = Packet.objects.filter(cmid=request.user.cmid).order_by('-created_at')
    serializer = PacketListSerializer(packets, many=True)
    return Response(serializer.data)
