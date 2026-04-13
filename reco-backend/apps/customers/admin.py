from django.contrib import admin
from .models import CustomerProfile


@admin.register(CustomerProfile)
class CustomerProfileAdmin(admin.ModelAdmin):
    list_display = ['customer_id', 'name', 'phone', 'cmid', 'session', 'consent_given', 'created_at']
    list_filter = ['consent_given', 'cmid']
    search_fields = ['name', 'phone', 'email']
    readonly_fields = ['customer_id', 'created_at']
