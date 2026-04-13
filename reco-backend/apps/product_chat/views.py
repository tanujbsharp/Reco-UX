"""
Product Chat views for Bsharp Reco.

Endpoints:
    POST /api/chat/ask — Ask a product question (RAG-powered).
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
from apps.product_chat.models import ChatMessage
from apps.product_chat.rag_service import get_answer

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def ask(request):
    """
    POST /api/chat/ask

    Request body:
        {
            "question": "What is the battery life of this product?",
            "product_ids": [123],
            "session_id": 1
        }

    Returns:
        {
            "answer": "...",
            "sources": [...]
        }
    """
    question = request.data.get('question', '').strip()
    product_ids = request.data.get('product_ids', [])
    session_id = request.data.get('session_id')

    # --- Validation ---
    if not question:
        return Response(
            {'detail': 'Question is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not product_ids or not isinstance(product_ids, list):
        return Response(
            {'detail': 'product_ids must be a non-empty list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not session_id:
        return Response(
            {'detail': 'session_id is required.'},
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

    # --- RAG pipeline ---
    try:
        result = get_answer(
            question=question,
            product_ids=product_ids,
            cmid=session.cmid,
        )
    except Exception as e:
        logger.exception('Product chat RAG failed for session %s', session_id)
        return Response(
            {'detail': f'Chat service unavailable: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # --- Save chat message ---
    ChatMessage.objects.create(
        session=session,
        product_ids=product_ids,
        question=question,
        answer=result['answer'],
    )

    return Response({
        'answer': result['answer'],
        'sources': result['sources'],
    })
