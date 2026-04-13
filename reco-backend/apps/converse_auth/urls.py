"""
URL patterns for converse_auth login endpoints.
Mounted at /login/ in root urls.py.

Matches FSD Section 19.1 / Section 3.5.
"""
from django.urls import path

from . import views

app_name = 'converse_auth_login'

urlpatterns = [
    path('login_user', views.login_user, name='login_user'),
    path('getLoggedInUserStatus', views.get_logged_in_user_status, name='get_logged_in_user_status'),
    path('user_logout', views.user_logout, name='user_logout'),
]
