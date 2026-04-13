"""
Serializers for Converse auth models.
Used in API responses for user details and company info.
"""
from rest_framework import serializers

from .models import CelebrateUsers, CelebrateCompanies, UserRoles


class UserDetailsSerializer(serializers.Serializer):
    """
    Serializer for the loginUserDetails response.
    Combines user, company, and role data into the format
    expected by the React frontend.
    """
    uid = serializers.IntegerField(source='id')
    cmid = serializers.IntegerField()
    email_id = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    role = serializers.SerializerMethodField()
    cm_color = serializers.SerializerMethodField()
    logo_image_url = serializers.SerializerMethodField()
    cm_name = serializers.SerializerMethodField()
    profile_file_name = serializers.CharField()
    designation = serializers.CharField()
    super_user = serializers.SerializerMethodField()

    def get_role(self, obj):
        """Get user role from UserRoles table."""
        try:
            user_role = UserRoles.objects.filter(uid=obj.id, status=0).first()
            if user_role:
                return user_role.rid
        except Exception:
            pass
        return obj.user_role

    def get_cm_color(self, obj):
        """Get company accent color."""
        company = self._get_company(obj)
        return company.cm_color if company else None

    def get_logo_image_url(self, obj):
        """Get company logo URL."""
        company = self._get_company(obj)
        return company.logo_image_url if company else None

    def get_cm_name(self, obj):
        """Get company name."""
        company = self._get_company(obj)
        return company.cm_name if company else None

    def get_super_user(self, obj):
        """Check if user is a super admin."""
        return obj.user_role == 1

    def _get_company(self, obj):
        """Cache and return the company for this user."""
        if not hasattr(self, '_company_cache'):
            self._company_cache = {}
        if obj.cmid not in self._company_cache:
            try:
                self._company_cache[obj.cmid] = CelebrateCompanies.objects.get(
                    cmid=obj.cmid
                )
            except CelebrateCompanies.DoesNotExist:
                self._company_cache[obj.cmid] = None
        return self._company_cache[obj.cmid]


class CelebrateCompaniesSerializer(serializers.ModelSerializer):
    """Serializer for company/brand details."""

    class Meta:
        model = CelebrateCompanies
        fields = ['cmid', 'cm_name', 'cm_domain', 'cm_color', 'logo_image_url']


class UserRolesSerializer(serializers.ModelSerializer):
    """Serializer for user roles."""

    class Meta:
        model = UserRoles
        fields = ['uid', 'rid', 'cmid', 'status']
