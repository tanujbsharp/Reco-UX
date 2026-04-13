"""
Django Admin configuration for Converse auth models.
These are read-only admin views for inspecting Converse data.
All queries routed to the 'converse' database.
"""
from django.contrib import admin

from .models import CelebrateUsers, CelebrateCompanies, UserRoles


class ConverseAdminMixin:
    """Force all admin queries to use the 'converse' database."""
    using = 'converse'

    def get_queryset(self, request):
        return super().get_queryset(request).using(self.using)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(CelebrateUsers)
class CelebrateUsersAdmin(ConverseAdminMixin, admin.ModelAdmin):
    list_display = ('id', 'email_id', 'first_name', 'last_name', 'cmid', 'user_role', 'status')
    list_filter = ('status', 'user_role', 'cmid')
    search_fields = ('email_id', 'first_name', 'last_name')
    readonly_fields = (
        'id', 'cmid', 'email_id', 'mobile_no', 'first_name', 'last_name',
        'password', 'user_role', 'status', 'designation', 'manager_email',
        'access_key', 'azure_id', 'bsharp_uid', 'whatsapp_opt', 'first_login',
        'profile_file_name',
    )


@admin.register(CelebrateCompanies)
class CelebrateCompaniesAdmin(ConverseAdminMixin, admin.ModelAdmin):
    list_display = ('cmid', 'cm_name', 'cm_domain', 'allow_access', 'emp_count')
    search_fields = ('cm_name', 'cm_domain')
    readonly_fields = (
        'cmid', 'cm_name', 'cm_domain', 'cm_color', 'logo_image_url',
        'bsharp_token', 'allow_access', 'emp_count',
    )


@admin.register(UserRoles)
class UserRolesAdmin(ConverseAdminMixin, admin.ModelAdmin):
    list_display = ('urid', 'uid', 'rid', 'cmid', 'status')
    list_filter = ('rid', 'status')
    readonly_fields = ('urid', 'uid', 'rid', 'cmid', 'status')
