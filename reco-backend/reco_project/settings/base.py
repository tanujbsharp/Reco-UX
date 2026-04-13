"""
Django base settings for Bsharp Reco.
Shared settings used by both dev and prod environments.
"""
import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent  # Bsharp_Reco_Implementation/

# Load .env from project root (install: pip install python-dotenv)
try:
    from dotenv import load_dotenv
    env_path = PROJECT_ROOT / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # python-dotenv not installed, rely on real env vars or dev.py defaults

def env(key, default=''):
    """Read from environment (populated by .env via dotenv)."""
    return os.environ.get(key, default)

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    'django_ratelimit',
    'django_q',
    # Bsharp Reco apps
    'apps.converse_auth',
    'apps.sessions_app',
    'apps.customers',
    'apps.voice',
    'apps.questions',
    'apps.recommendations',
    'apps.comparisons',
    'apps.product_chat',
    'apps.feedback',
    'apps.leads',
    'apps.packets',
    'apps.analytics',
    'apps.moderation',
    'apps.crawl',
    'apps.common',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'reco_project.middleware.ErrorHandlingMiddleware',
]

ROOT_URLCONF = 'reco_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'reco_project.wsgi.application'
ASGI_APPLICATION = 'reco_project.asgi.application'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.common.permissions.CsrfExemptSessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'apps.common.pagination.StandardPagination',
    'PAGE_SIZE': 20,
}

# CORS
CORS_ALLOW_CREDENTIALS = True

# Session and CSRF
CSRF_COOKIE_HTTPONLY = False  # JS must read csrftoken
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Database Router
DATABASE_ROUTERS = ['db_router.ConverseRouter']

# Auth
AUTHENTICATION_BACKENDS = ['apps.converse_auth.auth_backend.CelebrateAuthBackend']
AUTH_USER_MODEL = 'converse_auth.CelebrateUsers'

# Django Q
Q_CLUSTER = {
    'name': 'reco_cluster',
    'workers': 2,
    'timeout': 300,
    'retry': 360,
    'queue_limit': 50,
    'bulk': 10,
    'orm': 'default',
}

# ── AWS / Bedrock ──
AWS_REGION = env('AWS_REGION', 'ap-south-1')
AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY', '')
BEDROCK_MODEL_ID = env('BEDROCK_MODEL_ID', 'anthropic.claude-sonnet-4-20250514')

# ── S3 ──
AWS_S3_BUCKET = env('AWS_S3_BUCKET', 'bsharp-reco-media')

# ── SES ──
SES_FROM_EMAIL = env('SES_FROM_EMAIL', 'noreply@bsharpcorp.com')

# ── OpenSearch ──
OPENSEARCH_HOST = env('OPENSEARCH_HOST', 'localhost')
OPENSEARCH_PORT = int(env('OPENSEARCH_PORT', '9200'))
OPENSEARCH_USER = env('OPENSEARCH_USER', 'admin')
OPENSEARCH_PASSWORD = env('OPENSEARCH_PASSWORD', 'admin')

# ── Whisper ──
WHISPER_MODEL = env('WHISPER_MODEL', 'base')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
