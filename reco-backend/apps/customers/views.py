import logging

from rest_framework import status
from apps.common.permissions import CsrfExemptSessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.sessions_app.models import CustomerSession
from .models import CustomerProfile
from .serializers import CustomerProfileCreateSerializer, CustomerProfileSerializer

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def capture_customer(request):
    """
    POST /api/customers/
    Capture customer PII and consent, linked to an active session.

    Request body:
        session_id (int): The session to link this customer to.
        name (str): Customer name.
        phone (str): Customer phone number.
        email (str, optional): Customer email.
        consent_given (bool): Whether the customer consented.
    """
    serializer = CustomerProfileCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    # Validate session exists
    try:
        session = CustomerSession.objects.get(pk=data['session_id'])
    except CustomerSession.DoesNotExist:
        return Response(
            {'detail': 'Session not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Check if a customer profile already exists for this session
    if hasattr(session, 'customer'):
        return Response(
            {'detail': 'Customer profile already exists for this session.'},
            status=status.HTTP_409_CONFLICT,
        )

    # Create customer profile, deriving cmid and outlet_id from the session
    customer = CustomerProfile.objects.create(
        session=session,
        cmid=session.cmid,
        outlet_id=session.outlet_id,
        name=data['name'],
        phone=data['phone'],
        email=data.get('email'),
        consent_given=data['consent_given'],
    )

    logger.info(
        'Customer %s captured for session %s (cmid=%s)',
        customer.customer_id,
        session.session_id,
        session.cmid,
    )

    output = CustomerProfileSerializer(customer).data
    return Response(output, status=status.HTTP_201_CREATED)
