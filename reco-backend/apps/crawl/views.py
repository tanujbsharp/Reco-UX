"""
Crawl API views for Bsharp Reco.

Endpoints:
  POST /api/crawl/product/<product_id>  — queue a product crawl (brand admin only)

Ref: Phase 15 — Web Crawling and Content Enrichment.
"""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.common.permissions import IsBrandAdmin
from apps.crawl.tasks import trigger_product_crawl

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsBrandAdmin])
def trigger_crawl(request, product_id):
    """
    POST /api/crawl/product/<product_id>

    Queues an asynchronous crawl for the specified product.
    Only accessible to brand admins. The product must belong to the
    caller's tenant (cmid) and must have a non-empty product_url.

    Returns:
        {"status": "queued", "product_id": <int>}
    """
    from apps.packets.models import Product

    try:
        product = Product.objects.get(
            pk=product_id,
            packet__cmid=request.user.cmid,
        )
    except Product.DoesNotExist:
        return Response(
            {'error': 'Product not found or access denied.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not product.product_url:
        return Response(
            {'error': 'Product has no URL to crawl.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    trigger_product_crawl(product.product_id)

    return Response(
        {'status': 'queued', 'product_id': product.product_id},
        status=status.HTTP_202_ACCEPTED,
    )
