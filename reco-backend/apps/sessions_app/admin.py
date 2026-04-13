from django.contrib import admin
from .models import CustomerSession, SessionAnswer


@admin.register(CustomerSession)
class CustomerSessionAdmin(admin.ModelAdmin):
    list_display = ['session_id', 'conversation_id', 'cmid', 'user_id', 'status', 'discovery_mode', 'created_at']
    list_filter = ['status', 'discovery_mode', 'cmid']
    search_fields = ['conversation_id', 'cmid', 'user_id']
    readonly_fields = ['session_id', 'conversation_id', 'created_at', 'updated_at']


@admin.register(SessionAnswer)
class SessionAnswerAdmin(admin.ModelAdmin):
    list_display = ['answer_id', 'session', 'question_text', 'from_voice', 'created_at']
    list_filter = ['from_voice']
    readonly_fields = ['answer_id', 'created_at']
