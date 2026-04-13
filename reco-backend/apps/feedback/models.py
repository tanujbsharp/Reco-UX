"""
Feedback models for Bsharp Reco.

Stores customer feedback on recommendation sessions and learned
patterns derived from aggregated feedback data.
"""
from django.db import models


class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        related_name='feedback',
    )
    rating = models.IntegerField()  # 1-5
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    recommended_products = models.JSONField()
    customer_answers = models.JSONField()
    voice_tags = models.JSONField(null=True)
    scoring_weights = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback'

    def __str__(self):
        return f'Feedback {self.feedback_id} — Session {self.session_id} ({self.rating}/5)'


class FeedbackPattern(models.Model):
    pattern_id = models.AutoField(primary_key=True)
    cmid = models.IntegerField()
    packet_id = models.IntegerField()
    input_profile_hash = models.CharField(max_length=64)
    product_combination_hash = models.CharField(max_length=64)
    avg_rating = models.FloatField()
    session_count = models.IntegerField()
    pattern_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'feedback_patterns'

    def __str__(self):
        return (
            f'Pattern {self.pattern_id} cmid={self.cmid} '
            f'avg={self.avg_rating:.1f} ({self.session_count} sessions)'
        )
