"""
Async crawl tasks for Bsharp Reco.

Uses Django Q to queue product page crawls in the background.

Ref: Phase 15 — Web Crawling and Content Enrichment.
"""
import logging

from django_q.tasks import async_task

logger = logging.getLogger(__name__)


def trigger_product_crawl(product_id):
    """
    Queue an async crawl for a single product via Django Q.

    Args:
        product_id: Primary key of the Product to crawl.
    """
    async_task('apps.crawl.crawler.crawl_product', product_id)
    logger.info('Queued crawl task for product %s', product_id)


def trigger_bulk_crawl(packet_id):
    """
    Queue crawl tasks for all products in a packet that have pending URLs.

    Args:
        packet_id: Primary key of the Packet.

    Returns:
        int: Number of crawl tasks queued.
    """
    try:
        from apps.packets.models import Product
    except ImportError:
        logger.error('packets.Product not available')
        return 0

    products = Product.objects.filter(
        packet_id=packet_id,
        crawl_status='pending',
    ).exclude(product_url='')

    count = 0
    for product in products:
        trigger_product_crawl(product.product_id)
        count += 1

    logger.info('Queued %d crawl tasks for packet %s', count, packet_id)
    return count
