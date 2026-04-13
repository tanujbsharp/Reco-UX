"""
Analytics models for Bsharp Reco.

InteractionEvent: records every significant action during a customer session
(question answered, product viewed, recommendation shown, feedback given, etc.).
Used by the dashboard and analytics pipeline.
"""
from django.db import models


class InteractionEvent(models.Model):
    event_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        null=True,
        related_name='events',
    )
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    user_id = models.IntegerField(null=True)
    event_type = models.CharField(max_length=50, db_index=True)
    event_data = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interaction_events'

    def __str__(self):
        return f'Event {self.event_id}: {self.event_type} (session {self.session_id})'
