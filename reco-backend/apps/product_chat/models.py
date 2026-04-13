"""
Product Chat models for Bsharp Reco.

Stores the chat history between customers and the product knowledge
chatbot (RAG-powered via OpenSearch + Bedrock).
"""
from django.db import models


class ChatMessage(models.Model):
    message_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        related_name='chat_messages',
    )
    product_ids = models.JSONField()
    question = models.TextField()
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'chat_messages'

    def __str__(self):
        return f'Chat {self.message_id} for Session {self.session_id}'
