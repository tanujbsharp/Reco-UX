"""
Moderation models for Bsharp Reco.

ModerationRule: defines boost / suppress / push overrides that the
brand admin can apply to influence product scoring at the tenant level.
"""
from django.db import models


class ModerationRule(models.Model):
    TARGET_TYPE_BOOST = 'boost'
    TARGET_TYPE_SUPPRESS = 'suppress'
    TARGET_TYPE_PUSH = 'push'
    TARGET_TYPE_PROMOTE_IF_CLOSE = 'promote_if_close'

    TARGET_TYPE_CHOICES = [
        (TARGET_TYPE_BOOST, 'Boost'),
        (TARGET_TYPE_SUPPRESS, 'Suppress'),
        (TARGET_TYPE_PUSH, 'Push'),
        (TARGET_TYPE_PROMOTE_IF_CLOSE, 'Promote If Close'),
    ]

    rule_id = models.AutoField(primary_key=True)
    packet = models.ForeignKey(
        'packets.Packet',
        on_delete=models.CASCADE,
        related_name='moderation_rules',
    )
    target_type = models.CharField(max_length=50, choices=TARGET_TYPE_CHOICES)
    target_product_id = models.IntegerField(null=True)
    boost_strength = models.FloatField(default=1.0)
    min_fit_threshold = models.FloatField(default=0.3)
    target_rank = models.PositiveSmallIntegerField(default=1)
    max_rank = models.PositiveSmallIntegerField(default=2)
    max_gap_percent = models.FloatField(default=3.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'moderation_rules'

    def __str__(self):
        return f'Rule {self.rule_id}: {self.target_type} (packet {self.packet_id})'
