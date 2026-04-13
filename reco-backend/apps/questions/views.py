"""
Question Orchestrator views for Bsharp Reco.

Endpoints:
    POST /api/sessions/{session_id}/answer — Submit answer, get next question
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

from apps.sessions_app.models import CustomerSession, SessionAnswer
from apps.questions.orchestrator import generate_next_question
from apps.recommendations.preference_inference import infer_answer_score_effect
from apps.recommendations.models import RecommendationResult

logger = logging.getLogger(__name__)


@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def get_first_question(request, session_id):
    """
    GET /api/sessions/{session_id}/questions/

    Returns the first LLM-generated question for this session,
    using voice tags and session context. No answer submission needed.
    """
    try:
        session = CustomerSession.objects.get(pk=session_id)
    except CustomerSession.DoesNotExist:
        return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

    if session.user_id != request.user.id:
        return Response(
            {'detail': 'You do not have permission to access this session.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        first_question = generate_next_question(session_id)
    except Exception as e:
        logger.exception('First question generation failed for session %s', session_id)
        return Response({'detail': f'Failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(first_question)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def submit_answer(request, session_id):
    """
    POST /api/sessions/{session_id}/answer

    Submit an answer to the current question and receive the next question
    (or a done signal when the orchestrator has enough confidence).

    Request body:
        {
            "question_text": "What will you primarily use this laptop for?",
            "answer_value": "Work & Productivity",
            "from_voice": false
        }

    Success response (next question):
        {
            "question": "...",
            "type": "single-choice",
            "options": [...],
            "question_number": 2,
            "total_estimated": 5,
            "confidence": 0.55,
            "done": false
        }

    Success response (done):
        {
            "done": true,
            "confidence": 0.90,
            "message": "Ready for recommendations"
        }
    """
    # Step 1: Validate session exists and belongs to authenticated user
    try:
        session = CustomerSession.objects.get(pk=session_id)
    except CustomerSession.DoesNotExist:
        return Response(
            {'detail': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if session.user_id != request.user.id:
        return Response(
            {'detail': 'You do not have permission to access this session.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Validate request body
    question_text = request.data.get('question_text', '')
    answer_value = request.data.get('answer_value', '')
    from_voice = request.data.get('from_voice', False)
    score_effect = request.data.get('score_effect')

    if not isinstance(score_effect, dict) and not bool(from_voice):
        inferred_score_effect = infer_answer_score_effect(question_text, answer_value)
        score_effect = inferred_score_effect if inferred_score_effect.get('weight_adjustments') else None

    if not question_text or not answer_value:
        return Response(
            {'detail': 'Both "question_text" and "answer_value" are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Step 2: Save SessionAnswer to database
    answer = (
        SessionAnswer.objects
        .filter(
            session=session,
            question_text=question_text,
            from_voice=bool(from_voice),
        )
        .order_by('-created_at')
        .first()
    )
    if answer is None:
        answer = SessionAnswer.objects.create(
            session=session,
            question_text=question_text,
            answer_value=answer_value,
            from_voice=bool(from_voice),
            score_effect=score_effect if isinstance(score_effect, (dict, list)) else None,
        )
    else:
        answer.answer_value = answer_value
        answer.score_effect = score_effect if isinstance(score_effect, (dict, list)) else None
        answer.save(update_fields=['answer_value', 'score_effect'])
    logger.info(
        'Answer %s saved for session %s (from_voice=%s)',
        answer.answer_id,
        session_id,
        from_voice,
    )

    RecommendationResult.objects.filter(session=session).delete()

    # Step 3: Call orchestrator to generate next question with updated context
    try:
        next_question = generate_next_question(session_id)
    except Exception as e:
        logger.exception(
            'Question generation failed for session %s after answer %s',
            session_id,
            answer.answer_id,
        )
        return Response(
            {'detail': f'Failed to generate next question: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Step 4: Return next question OR done signal
    if next_question.get('done'):
        return Response({
            'done': True,
            'confidence': next_question.get('confidence', 1.0),
            'question_number': next_question.get('question_number'),
            'total_estimated': next_question.get('total_estimated'),
            'message': next_question.get('message', 'Ready for recommendations'),
        })

    return Response(next_question)
