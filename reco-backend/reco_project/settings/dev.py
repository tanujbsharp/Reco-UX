"""
Django development settings for Bsharp Reco.
Local development overrides. Reads from .env via base.py's dotenv loader.
"""
from .base import *  # noqa: F401, F403
from .base import env

DEBUG = True
SECRET_KEY = env('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

DATABASES = {
    'default': {  # Reco DB (Reco's own tables)
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env('RECO_DB_NAME', 'reco_db'),
        'USER': env('RECO_DB_USER', 'root'),
        'PASSWORD': env('RECO_DB_PASSWORD', ''),
        'HOST': '127.0.0.1',
        'PORT': env('RECO_DB_PORT', '3306'),
    },
    'converse': {  # Converse DB (existing celebrate database)
        'ENGINE': 'django.db.backends.mysql',
        'NAME': env('CONVERSE_DB_NAME', 'celebrate'),
        'USER': env('CONVERSE_DB_USER', 'root'),
        'PASSWORD': env('CONVERSE_DB_PASSWORD', ''),
        'HOST': '127.0.0.1',
        'PORT': env('CONVERSE_DB_PORT', '3306'),
    },
}

CORS_ALLOWED_ORIGINS = [
    'http://localhost:4200',   # Angular login (dev)
    'http://localhost:5173',   # React app (dev)
]

SESSION_COOKIE_DOMAIN = None   # localhost
CSRF_COOKIE_DOMAIN = None      # localhost

# Silence ratelimit cache check in dev
SILENCED_SYSTEM_CHECKS = ['django_ratelimit.E003', 'django_ratelimit.W001']
