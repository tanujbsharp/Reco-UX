"""
Converse auth views for Bsharp Reco.

Stub views for Phase 0. Full implementation in Phase 2.
Endpoints match FSD Section 3.5 / Section 19.1.
"""
import hashlib
import json
import logging
import time

from django.contrib.auth import authenticate, login, logout
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from apps.common.permissions import CsrfExemptSessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CelebrateUsers, CelebrateCompanies, UserRoles
from .serializers import UserDetailsSerializer

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST"])
def login_user(request):
    """
    POST /login/login_user

    Authenticate user with email + password.
    Request body: {"mail": "user@brand.com", "password": "xxx", "remember_me": 0|1}
    Returns: "success" or "Unauthorized"

    Modeled on Converse's login/views.py login_user endpoint.
    """
    try:
        body = json.loads(request.body)
        email = body.get('mail', '').strip().lower()
        password = body.get('password', '')
        remember_me = body.get('remember_me', 0)

        if not email or not password:
            return JsonResponse('Unauthorized', safe=False, status=401)

        # Check user exists and is not blocked (status != 4)
        try:
            user_obj = CelebrateUsers.objects.filter(
                ~Q(status=4), email_id=email
            ).first()
        except Exception:
            return JsonResponse('Unauthorized', safe=False, status=401)

        if user_obj is None:
            return JsonResponse('Unauthorized', safe=False, status=401)

        # Authenticate using custom backend
        user = authenticate(request, email_id=email, password=password)

        if user is not None and user.is_active:
            # Track first login
            if user.first_login == 0:
                user.first_login = int(time.time())
                CelebrateUsers.objects.filter(pk=user.pk).update(
                    first_login=user.first_login
                )

            # Generate access key (SHA-256)
            access_key = hashlib.sha256(
                f'{user.id}{time.time()}'.encode()
            ).hexdigest()
            CelebrateUsers.objects.filter(pk=user.pk).update(
                access_key=access_key
            )

            # Log the user in (sets sessionid cookie)
            login(request, user)

            # Set session expiry based on remember_me
            if remember_me:
                request.session.set_expiry(30 * 24 * 60 * 60)  # 30 days
            else:
                request.session.set_expiry(0)  # Browser close

            logger.info('User %s logged in successfully', email)
            return JsonResponse('success', safe=False)

        logger.warning('Failed login attempt for %s', email)
        return JsonResponse('Unauthorized', safe=False, status=401)

    except json.JSONDecodeError:
        return JsonResponse('Invalid request', safe=False, status=400)
    except Exception as e:
        logger.exception('Login error: %s', str(e))
        return JsonResponse('Server error', safe=False, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def get_logged_in_user_status(request):
    """
    POST /login/getLoggedInUserStatus

    Check user status by email before login attempt.
    Request body: {"mail": "user@brand.com"}
    Returns: numeric status code
        1 = active user, can log in
        2 = invited user, needs to complete setup
        5 = generic domain (gmail, yahoo, etc.)
        6 = new user, domain not registered
        7 = blocked user
        8 = admin approval required

    Modeled on Converse's login/views.py getLoggedInUserStatus endpoint.
    """
    GENERIC_DOMAINS = {
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
        'aol.com', 'icloud.com', 'mail.com', 'protonmail.com',
    }

    try:
        body = json.loads(request.body)
        email = body.get('mail', '').strip().lower()

        if not email or '@' not in email:
            return JsonResponse(6, safe=False)

        domain = email.split('@')[1]

        # Check for generic domain
        if domain in GENERIC_DOMAINS:
            return JsonResponse(5, safe=False)

        # Check if domain is registered
        company = CelebrateCompanies.objects.filter(cm_domain=domain).first()
        if not company:
            return JsonResponse(6, safe=False)

        # Check if user exists
        user = CelebrateUsers.objects.filter(email_id=email).first()
        if not user:
            # Domain registered but user not found
            return JsonResponse(6, safe=False)

        # Check user status
        if user.status == 4:
            return JsonResponse(7, safe=False)  # Blocked
        elif user.status == 1:
            return JsonResponse(2, safe=False)  # Invited
        elif user.status == 5:
            return JsonResponse(1, safe=False)  # Active

        # Check admin approval
        if company.allow_access == 0:
            return JsonResponse(8, safe=False)

        return JsonResponse(1, safe=False)

    except json.JSONDecodeError:
        return JsonResponse(6, safe=False)
    except Exception as e:
        logger.exception('Status check error: %s', str(e))
        return JsonResponse(6, safe=False)


@api_view(['GET'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def login_user_details(request):
    """
    GET /users/loginUserDetails

    Returns details of the currently logged-in user.
    This is the auth probe endpoint — React calls this on mount to verify
    the user is authenticated and to get user/company context.

    Returns: JSON with uid, cmid, email_id, first_name, last_name, role,
             cm_color, logo_image_url, cm_name, profile_file_name, super_user.
    """
    user = request.user
    serializer = UserDetailsSerializer(user)
    return Response(serializer.data)


@require_http_methods(["GET"])
def user_logout(request):
    """
    GET /login/user_logout

    Log out the current user. Clears the Django session.
    """
    logout(request)
    return JsonResponse('success', safe=False)
