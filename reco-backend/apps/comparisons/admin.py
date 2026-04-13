from django.contrib import admin

from apps.comparisons.models import ComparisonCache


@admin.register(ComparisonCache)
class ComparisonCacheAdmin(admin.ModelAdmin):
    list_display = [
        'cache_id', 'product_pair_key', 'cmid', 'hit_count',
        'created_at', 'updated_at',
    ]
    list_filter = ['cmid']
    search_fields = ['product_pair_key']
    readonly_fields = [
        'cache_id', 'product_pair_key', 'feature_set_hash',
        'commentary', 'implications', 'winner_by_feature',
        'hit_count', 'created_at', 'updated_at',
    ]
