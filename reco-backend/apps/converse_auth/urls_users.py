"""
URL patterns for converse_auth user endpoints.
Mounted at /users/ in root urls.py.

Matches FSD Section 19.1 / Section 3.5.
"""
from django.urls import path

from . import views

app_name = 'converse_auth_users'

urlpatterns = [
    path('loginUserDetails', views.login_user_details, name='login_user_details'),
]
