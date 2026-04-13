"""
Django production settings for Bsharp Reco.
Production overrides — secrets loaded from environment variables.
"""
import os

from .base import *  # noqa: F401, F403

DEBUG = False
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'CHANGE-ME-IN-PRODUCTION')
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '').split(',')

DATABASES = {
    'default': {  # Reco DB
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('RECO_DB_NAME', 'reco_db'),
        'USER': os.environ.get('RECO_DB_USER', 'reco_user'),
        'PASSWORD': os.environ.get('RECO_DB_PASSWORD', ''),
        'HOST': os.environ.get('RECO_DB_HOST', 'localhost'),
        'PORT': os.environ.get('RECO_DB_PORT', '3306'),
    },
    'converse': {  # Converse DB (read-only)
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('CONVERSE_DB_NAME', 'converse_db'),
        'USER': os.environ.get('CONVERSE_DB_USER', 'converse_readonly'),
        'PASSWORD': os.environ.get('CONVERSE_DB_PASSWORD', ''),
        'HOST': os.environ.get('CONVERSE_DB_HOST', 'localhost'),
        'PORT': os.environ.get('CONVERSE_DB_PORT', '3306'),
    },
}

# Cookie domains for cross-subdomain sharing
SESSION_COOKIE_DOMAIN = '.reco.bsharpcorp.com'
CSRF_COOKIE_DOMAIN = '.reco.bsharpcorp.com'
CSRF_COOKIE_HTTPONLY = False
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'https://login.reco.bsharpcorp.com',
    'https://app.reco.bsharpcorp.com',
]

# Security settings
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
