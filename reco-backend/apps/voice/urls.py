from django.urls import path

from apps.voice import views

app_name = 'voice'

urlpatterns = [
    path('voice/transcribe', views.transcribe, name='transcribe'),
    path('voice/analyze-text', views.analyze_text, name='analyze_text'),
]
