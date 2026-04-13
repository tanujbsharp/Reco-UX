"""
Lead, Handoff, and Share models for Bsharp Reco.

Tracks:
- Lead capture when a customer shows buying intent
- Handoff requests to outlet staff for follow-up
- Share events (email/WhatsApp) for recommendation sharing
"""
from django.db import models


class Lead(models.Model):
    lead_id = models.AutoField(primary_key=True)
    customer = models.ForeignKey(
        'customers.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='leads',
    )
    session = models.ForeignKey(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        related_name='leads',
    )
    cmid = models.IntegerField()
    outlet_id = models.IntegerField(null=True)
    lead_status = models.CharField(max_length=20, default='new')
    selected_product_id = models.IntegerField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'leads'

    def __str__(self):
        return f'Lead {self.lead_id} — status={self.lead_status}'


class HandoffRequest(models.Model):
    handoff_id = models.AutoField(primary_key=True)
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name='handoffs',
    )
    outlet_id = models.IntegerField()
    product_id = models.IntegerField()
    status = models.CharField(max_length=20, default='pending')
    discussion_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'handoff_requests'

    def __str__(self):
        return f'Handoff {self.handoff_id} — Lead {self.lead_id} ({self.status})'


class ShareEvent(models.Model):
    share_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        related_name='shares',
    )
    share_method = models.CharField(max_length=20, default='email')
    recipient = models.CharField(max_length=255)
    ses_message_id = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'share_events'

    def __str__(self):
        return f'Share {self.share_id} via {self.share_method} to {self.recipient}'


class LeadCaptureConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(
        'packets.Packet',
        on_delete=models.CASCADE,
        related_name='lead_configs',
    )
    required_fields = models.JSONField(default=list)
    consent_text = models.TextField()
    email_template_id = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'lead_capture_configs'

    def __str__(self):
        return f'LeadCaptureConfig {self.config_id} for Packet {self.packet_id}'
