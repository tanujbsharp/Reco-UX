import os

from django.apps import AppConfig


class VoiceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.voice'
    label = 'voice'
    verbose_name = 'Whisper STT & Tag Extraction'

    def ready(self):
        if os.environ.get('PRELOAD_WHISPER', '0') == '1':
            from .whisper_service import get_whisper_model
            get_whisper_model()
