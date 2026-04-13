from django.contrib import admin

from apps.moderation.models import ModerationRule


@admin.register(ModerationRule)
class ModerationRuleAdmin(admin.ModelAdmin):
    list_display = (
        'rule_id', 'packet', 'target_type', 'target_product_id',
        'boost_strength', 'min_fit_threshold', 'is_active', 'created_at',
    )
    list_filter = ('target_type', 'is_active', 'packet')
    search_fields = ('target_type',)
