"""
Voice Discovery Pipeline views for Bsharp Reco.

Endpoints:
    POST /api/voice/transcribe   — Upload audio, get transcript + tags
    POST /api/voice/analyze-text — Submit text directly, get tags
"""
import logging

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from apps.common.permissions import CsrfExemptSessionAuthentication
from rest_framework.response import Response

from apps.voice.whisper_service import transcribe_audio
from apps.voice.tag_extractor import extract_tags

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def transcribe(request):
    """
    POST /api/voice/transcribe

    Accepts multipart/form-data with an 'audio' file field
    (WebM/Opus from browser MediaRecorder).

    Returns:
        {
            "transcript": "...",
            "language": "en",
            "tags": [{"tag": "...", "category": "...", "confidence": 0.9}, ...]
        }
    """
    audio_file = request.FILES.get('audio')
    if not audio_file:
        return Response(
            {'error': 'No audio file provided. Upload with field name "audio".'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        audio_bytes = audio_file.read()

        # Determine file extension from uploaded filename
        file_extension = 'webm'
        if audio_file.name:
            parts = audio_file.name.rsplit('.', 1)
            if len(parts) > 1:
                file_extension = parts[1].lower()

        # Step 1: Transcribe audio via Whisper
        transcription = transcribe_audio(audio_bytes, file_extension=file_extension)
        transcript_text = transcription.get('transcript', '')

        # Step 2: Extract preference tags via Bedrock
        tags = extract_tags(transcript_text)

        return Response({
            'transcript': transcript_text,
            'language': transcription.get('language', 'en'),
            'tags': tags,
        })

    except Exception as e:
        logger.exception('Voice transcription failed')
        return Response(
            {'error': f'Transcription failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def analyze_text(request):
    """
    POST /api/voice/analyze-text

    Accepts JSON body: {"text": "I need a laptop for..."}
    Skips Whisper, goes directly to Bedrock tag extraction.

    Returns:
        {"tags": [{"tag": "...", "category": "...", "confidence": 0.9}, ...]}
    """
    text = request.data.get('text', '')
    if not text or not text.strip():
        return Response(
            {'error': 'No text provided. Include a "text" field in the request body.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        tags = extract_tags(text)
        return Response({'tags': tags})

    except Exception as e:
        logger.exception('Text analysis failed')
        return Response(
            {'error': f'Text analysis failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
