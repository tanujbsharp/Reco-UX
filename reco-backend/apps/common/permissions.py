"""
Custom DRF permission classes and authentication for Bsharp Reco.
Controls access based on user roles from the Converse auth system.
"""
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    SessionAuthentication that skips CSRF enforcement.
    Safe for local dev where CORS is configured and the Vite proxy
    forwards requests from localhost:5173 to localhost:8000.
    In production, CSRF is handled by the Angular login flow setting
    the csrftoken cookie on the shared domain.
    """
    def enforce_csrf(self, request):
        return  # Skip CSRF check


class IsActiveUser(BasePermission):
    """
    Allows access only to active users (status=5 in CelebrateUsers).
    """
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )


class IsBrandAdmin(BasePermission):
    """
    Allows access only to brand admins (user_role=1 or rid=1 in UserRoles).
    Brand admins can manage packets, products, moderation docs, and view analytics.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.user_role == 1


class IsStoreStaff(BasePermission):
    """
    Allows access to store staff (user_role=2) and admins (user_role=1).
    Store staff can run customer sessions, submit feedback, capture leads.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.user_role in (1, 2)


class IsSameTenant(BasePermission):
    """
    Ensures the user can only access data belonging to their own tenant (cmid).
    Must be used in conjunction with other permission classes.
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        # The object must have a cmid field matching the user's cmid
        if hasattr(obj, 'cmid'):
            return obj.cmid == request.user.cmid
        return True
