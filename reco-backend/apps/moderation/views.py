"""
Moderation API views.

Endpoints:
  POST /api/moderation/docs/   — upload a moderation document (brand admin only)
  GET  /api/moderation/rules/  — list moderation rules for a packet
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.common.permissions import IsBrandAdmin
from apps.moderation.models import ModerationRule
from apps.moderation.opensearch_indexer import index_moderation_doc
from apps.packets.models import Packet

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsBrandAdmin])
def upload_moderation_doc(request):
    """
    POST /api/moderation/docs/

    Body (JSON):
        packet_id   — int, required
        doc_type    — str, required (policy | guideline | faq)
        title       — str, required
        content     — str, required (full document text)
        metadata    — dict, optional

    Chunks the document and indexes it to OpenSearch for RAG retrieval.
    """
    data = request.data
    packet_id = data.get('packet_id')
    doc_type = data.get('doc_type')
    title = data.get('title')
    content = data.get('content')

    if not all([packet_id, doc_type, title, content]):
        return Response(
            {'error': 'packet_id, doc_type, title, and content are all required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Verify packet belongs to caller's tenant
    try:
        packet = Packet.objects.get(packet_id=packet_id, cmid=request.user.cmid)
    except Packet.DoesNotExist:
        return Response(
            {'error': 'Packet not found or access denied.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    metadata = data.get('metadata', {})
    chunk_count = index_moderation_doc(
        cmid=request.user.cmid,
        packet_id=packet.packet_id,
        doc_type=doc_type,
        title=title,
        content=content,
        metadata=metadata,
    )

    return Response({
        'message': 'Document indexed successfully.',
        'chunks_indexed': chunk_count,
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsBrandAdmin])
def list_moderation_rules(request):
    """
    GET /api/moderation/rules/?packet_id=<int>

    Returns moderation rules for the given packet.
    """
    packet_id = request.query_params.get('packet_id')
    if not packet_id:
        return Response(
            {'error': 'packet_id query param is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    rules = ModerationRule.objects.filter(
        packet_id=packet_id,
        packet__cmid=request.user.cmid,
    ).values(
        'rule_id', 'target_type', 'target_product_id',
        'boost_strength', 'min_fit_threshold', 'is_active', 'created_at',
    )

    return Response(list(rules))
