"""
Global error-handling middleware for Bsharp Reco.
Catches unhandled exceptions and returns consistent JSON error responses.
"""
import logging

from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware:
    """
    Middleware that catches any unhandled exception raised by a view and
    returns a structured JSON 500 response instead of Django's default
    HTML error page.  In DEBUG mode the actual exception message is
    included; in production a generic message is returned.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        return response

    def process_exception(self, request, exception):
        logger.exception('Unhandled exception: %s', str(exception))
        return JsonResponse({
            'error': 'Internal server error',
            'detail': str(exception) if settings.DEBUG else 'An unexpected error occurred',
        }, status=500)
