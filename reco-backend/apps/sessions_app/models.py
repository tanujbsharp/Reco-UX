import uuid
from django.db import models


class CustomerSession(models.Model):
    session_id = models.AutoField(primary_key=True)
    conversation_id = models.UUIDField(unique=True, default=uuid.uuid4)
    cmid = models.IntegerField()           # Tenant (from CelebrateCompanies)
    outlet_id = models.IntegerField(null=True)
    user_id = models.IntegerField()         # Store staff (from CelebrateUsers)
    packet_id = models.IntegerField(null=True)
    discovery_mode = models.CharField(
        max_length=20,
        choices=[('voice', 'Voice'), ('text', 'Text'), ('guided', 'Guided')],
        blank=True,
    )
    status = models.CharField(max_length=20, default='active')
    recommendation_feedback_stars = models.IntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customer_sessions'

    def __str__(self):
        return f'Session {self.session_id} ({self.status})'


class SessionAnswer(models.Model):
    answer_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        CustomerSession,
        on_delete=models.CASCADE,
        related_name='answers',
    )
    question_text = models.TextField()
    answer_value = models.TextField()
    from_voice = models.BooleanField(default=False)
    score_effect = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'session_answers'

    def __str__(self):
        return f'Answer {self.answer_id} for Session {self.session_id}'
