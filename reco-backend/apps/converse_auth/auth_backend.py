"""
Custom authentication backend for Bsharp Reco.
Authenticates against CelebrateUsers in the Converse database
using email_id and password (Django's check_password).
"""
from django.contrib.auth.backends import BaseBackend

from .models import CelebrateUsers


class CelebrateAuthBackend(BaseBackend):
    """
    Authenticate users against the CelebrateUsers table in the Converse DB.
    Uses email_id as the login credential and Django's check_password()
    for password verification.
    """

    def authenticate(self, request, email_id=None, password=None, username=None, **kwargs):
        """
        Authenticate a user by email_id and password.

        Accepts both email_id= (from our login views) and username= (from Django Admin).

        Returns:
            CelebrateUsers instance if authentication succeeds, None otherwise.
        """
        email_id = email_id or username
        if email_id is None or password is None:
            return None

        try:
            user = CelebrateUsers.objects.using('converse').get(email_id=email_id)
        except CelebrateUsers.DoesNotExist:
            return None

        if user.check_password(password) and user.is_active:
            return user

        return None

    def get_user(self, user_id):
        """
        Retrieve a user by primary key. Required by Django's auth framework.

        Args:
            user_id: The user's primary key (id).

        Returns:
            CelebrateUsers instance or None.
        """
        try:
            return CelebrateUsers.objects.using('converse').get(pk=user_id)
        except CelebrateUsers.DoesNotExist:
            return None
