"""
Comparison Engine views for Bsharp Reco.

Endpoint:
    POST /api/comparisons/
        Compare two products feature-by-feature using the cached
        comparison engine backed by Amazon Bedrock.
"""
import logging

from rest_framework import status
from apps.common.permissions import CsrfExemptSessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.comparisons.comparator import compare_products, ProductNotFoundError

logger = logging.getLogger(__name__)


@api_view(['POST'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def compare_products_view(request):
    """
    POST /api/comparisons/

    Request body:
        {
            "product_id_1": 123,
            "product_id_2": 456
        }

    Returns:
        {
            "product_1": {...},
            "product_2": {...},
            "feature_comparison": [
                {
                    "feature": "Battery Life",
                    "product_1_value": "18h",
                    "product_2_value": "12h",
                    "winner": "product_1",
                    "commentary": "..."
                }
            ],
            "implications": {
                "product_1": ["..."],
                "product_2": ["..."]
            },
            "cache_hit": true/false
        }
    """
    # --- Validate request ---
    product_id_1 = request.data.get('product_id_1')
    product_id_2 = request.data.get('product_id_2')

    if product_id_1 is None or product_id_2 is None:
        return Response(
            {'detail': 'Both product_id_1 and product_id_2 are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        product_id_1 = int(product_id_1)
        product_id_2 = int(product_id_2)
    except (ValueError, TypeError):
        return Response(
            {'detail': 'product_id_1 and product_id_2 must be integers.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if product_id_1 == product_id_2:
        return Response(
            {'detail': 'Cannot compare a product with itself.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Derive cmid from the authenticated user (tenant scoping)
    cmid = getattr(request.user, 'cmid', 0)

    # --- Run comparison ---
    try:
        result = compare_products(
            product_id_1=product_id_1,
            product_id_2=product_id_2,
            cmid=cmid,
            session=None,  # No session context for standalone comparisons
        )
    except ProductNotFoundError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception as e:
        logger.exception(
            'Comparison failed for products %s vs %s',
            product_id_1, product_id_2,
        )
        return Response(
            {'detail': f'Comparison failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return Response(result)
