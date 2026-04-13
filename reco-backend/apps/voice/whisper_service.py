"""
Whisper STT service for Bsharp Reco.
Loads the Whisper base model lazily (singleton) and transcribes audio bytes
(WebM/Opus from browser MediaRecorder) via ffmpeg conversion to WAV.

Performance: ~15-30 sec for 2 min audio on CPU.
"""
import os
import tempfile
import logging

logger = logging.getLogger(__name__)

_whisper_model = None


def get_whisper_model():
    """Load the Whisper base model on first call (singleton pattern)."""
    global _whisper_model
    if _whisper_model is None:
        import whisper
        _whisper_model = whisper.load_model('base')
        logger.info('Whisper base model loaded')
    return _whisper_model


def transcribe_audio(audio_bytes: bytes, file_extension: str = 'webm') -> dict:
    """
    Transcribe audio bytes using Whisper.

    Steps:
        1. Save audio to a temp file with the given extension.
        2. Convert to 16 kHz mono WAV using ffmpeg.
        3. Run Whisper inference on the WAV.
        4. Return transcript text and detected language.

    Args:
        audio_bytes: Raw audio data (e.g. WebM/Opus from browser).
        file_extension: File extension hint for the input format.

    Returns:
        dict with keys 'transcript' (str) and 'language' (str).
    """
    model = get_whisper_model()

    with tempfile.NamedTemporaryFile(suffix=f'.{file_extension}', delete=False) as tmp_input:
        tmp_input.write(audio_bytes)
        tmp_input_path = tmp_input.name

    wav_path = tmp_input_path.replace(f'.{file_extension}', '.wav')

    try:
        import subprocess
        subprocess.run(
            [
                'ffmpeg', '-i', tmp_input_path,
                '-ar', '16000', '-ac', '1',
                '-c:a', 'pcm_s16le', wav_path, '-y',
            ],
            capture_output=True,
            check=True,
        )

        result = model.transcribe(wav_path)

        return {
            'transcript': result.get('text', '').strip(),
            'language': result.get('language', 'en'),
        }
    finally:
        for path in [tmp_input_path, wav_path]:
            if os.path.exists(path):
                os.unlink(path)
