from django.contrib import admin

from apps.analytics.models import InteractionEvent


@admin.register(InteractionEvent)
class InteractionEventAdmin(admin.ModelAdmin):
    list_display = ('event_id', 'event_type', 'cmid', 'outlet_id', 'user_id', 'session', 'created_at')
    list_filter = ('event_type', 'cmid')
    search_fields = ('event_type',)
    readonly_fields = ('event_id', 'created_at')
