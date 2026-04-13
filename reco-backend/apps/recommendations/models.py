"""
Recommendation models for Bsharp Reco.

Stores the output of the scoring pipeline — top 3 product
recommendations per customer session, with scores, match
percentages, and LLM-generated explanation text.
"""
from django.db import models


class RecommendationResult(models.Model):
    result_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        'sessions_app.CustomerSession',
        on_delete=models.CASCADE,
        related_name='recommendations',
    )
    product_id = models.IntegerField()
    rank = models.IntegerField()
    final_score = models.FloatField()
    match_percentage = models.IntegerField()
    explanation_text = models.TextField(blank=True)
    scoring_breakdown = models.JSONField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recommendation_results'
        ordering = ['rank']

    def __str__(self):
        return (
            f'Recommendation #{self.rank} for Session {self.session_id} '
            f'(product={self.product_id}, score={self.final_score:.2f})'
        )
