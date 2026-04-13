from django.contrib import admin
from apps.recommendations.models import RecommendationResult


@admin.register(RecommendationResult)
class RecommendationResultAdmin(admin.ModelAdmin):
    list_display = [
        'result_id',
        'session',
        'product_id',
        'rank',
        'final_score',
        'match_percentage',
        'created_at',
    ]
    list_filter = ['rank', 'created_at']
    search_fields = ['session__session_id', 'product_id']
    readonly_fields = ['result_id', 'created_at']
    ordering = ['-created_at', 'rank']
