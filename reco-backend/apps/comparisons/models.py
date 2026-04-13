"""
Comparison Engine models for Bsharp Reco.

ComparisonCache stores pre-computed product-pair comparisons
keyed by a sorted product-pair key and a SHA-256 hash of the
combined feature values.  Cache is global within a tenant (cmid).

Invalidation is automatic: when underlying feature data changes
the feature_set_hash will differ, causing a cache miss and a
fresh Bedrock call.
"""
from django.db import models


class ComparisonCache(models.Model):
    cache_id = models.AutoField(primary_key=True)
    product_pair_key = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Sorted pair key: "min_id-max_id"',
    )
    feature_set_hash = models.CharField(
        max_length=64,
        help_text='SHA-256 digest of combined feature values for both products',
    )
    cmid = models.IntegerField(
        help_text='Tenant identifier (from CelebrateCompanies)',
    )
    commentary = models.JSONField(
        help_text='Per-feature commentary from LLM comparison',
    )
    implications = models.JSONField(
        help_text='Trade-off narratives keyed by product',
    )
    winner_by_feature = models.JSONField(
        help_text='Which product wins each feature',
    )
    hit_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'comparison_cache'
        unique_together = [['product_pair_key', 'feature_set_hash']]

    def __str__(self):
        return (
            f'ComparisonCache {self.cache_id} '
            f'({self.product_pair_key}, hits={self.hit_count})'
        )
