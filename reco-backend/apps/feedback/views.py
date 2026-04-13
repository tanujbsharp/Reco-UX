"""
Feedback views for Bsharp Reco.

Endpoints:
    POST /api/feedback/ — Submit feedback for a recommendation session.
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
from apps.recommendations.models import RecommendationResult
from apps.feedback.models import Feedback

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def submit_feedback(request):
    """
    POST /api/feedback/

    Request body:
        {
            "session_id": 1,
            "rating": 4
        }

    Loads the session context (recommendations, answers, voice tags)
    and persists a full-context Feedback record.

    Updates CustomerSession.recommendation_feedback_stars.
    """
    session_id = request.data.get('session_id')
    rating = request.data.get('rating')

    # --- Validation ---
    if not session_id:
        return Response(
            {'detail': 'session_id is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if rating is None:
        return Response(
            {'detail': 'rating is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response(
            {'detail': 'rating must be an integer.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if rating < 1 or rating > 5:
        return Response(
            {'detail': 'rating must be between 1 and 5.'},
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

    # --- Gather full context ---
    # Top 3 recommendations
    recommendations = list(
        RecommendationResult.objects.filter(session=session)
        .order_by('rank')[:3]
        .values('product_id', 'rank', 'final_score', 'match_percentage')
    )

    # Customer answers
    answers = list(
        SessionAnswer.objects.filter(session=session)
        .order_by('created_at')
        .values('question_text', 'answer_value', 'from_voice')
    )

    # Voice tags (extracted from voice-sourced answers)
    voice_tags = []
    for ans in SessionAnswer.objects.filter(session=session, from_voice=True):
        if ans.score_effect and isinstance(ans.score_effect, list):
            voice_tags.extend(ans.score_effect)
        elif ans.score_effect and isinstance(ans.score_effect, dict):
            voice_tags.append(ans.score_effect)

    # Scoring weights — take from first recommendation's breakdown
    scoring_weights = None
    first_reco = (
        RecommendationResult.objects.filter(session=session)
        .order_by('rank')
        .first()
    )
    if first_reco and first_reco.scoring_breakdown:
        scoring_weights = first_reco.scoring_breakdown

    # --- Save feedback ---
    feedback = Feedback.objects.create(
        session=session,
        rating=rating,
        cmid=session.cmid,
        outlet_id=session.outlet_id,
        recommended_products=recommendations,
        customer_answers=answers,
        voice_tags=voice_tags or None,
        scoring_weights=scoring_weights,
    )

    # --- Update session ---
    session.recommendation_feedback_stars = rating
    session.save(update_fields=['recommendation_feedback_stars', 'updated_at'])

    logger.info(
        'Feedback %s saved for session %s — rating %d/5',
        feedback.feedback_id, session_id, rating,
    )

    return Response({
        'feedback_id': feedback.feedback_id,
        'session_id': session_id,
        'rating': rating,
    }, status=status.HTTP_201_CREATED)
