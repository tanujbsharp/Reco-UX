"""
Product page crawler for Bsharp Reco.

Fetches a product URL, extracts description / highlights / images using
either domain-specific CSS selectors or an LLM fallback via Bedrock,
then saves results to CrawledProductContent and re-indexes to OpenSearch.

Ref: Phase 15 — Web Crawling and Content Enrichment.
"""
import json
import logging
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

from apps.common.bedrock_client import BedrockClient
from .models import CrawledProductContent, CrawlConfig

logger = logging.getLogger(__name__)

# Limit raw HTML stored in the database (100 KB)
MAX_RAW_HTML_LENGTH = 100_000
# Limit HTML sent to the LLM prompt (50 KB fetch, 30 KB in prompt)
MAX_HTML_FOR_LLM = 50_000
MAX_HTML_IN_PROMPT = 30_000

USER_AGENT = 'BsharpReco/1.0 (Content Enrichment Bot)'
REQUEST_TIMEOUT = 30


def crawl_product(product_id):
    """
    Crawl a product's URL and extract content.

    Workflow:
      1. Fetch HTML from product.product_url
      2. Look up domain-specific CrawlConfig for CSS selectors
      3. If selectors configured, parse with BeautifulSoup
      4. If parsing yields nothing or use_llm_fallback is True, use Bedrock
      5. Save CrawledProductContent
      6. Update Product.crawl_status
      7. Re-index product to OpenSearch reco_product_kb

    Args:
        product_id: Primary key of the Product to crawl.

    Returns:
        CrawledProductContent instance on success, None on failure.
    """
    try:
        from apps.packets.models import Product
    except ImportError:
        logger.error('packets.Product not available')
        return None

    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        logger.error('Product %s not found', product_id)
        return None

    if not product.product_url:
        logger.warning('Product %s has no URL', product_id)
        return None

    url = product.product_url
    domain = urlparse(url).netloc

    try:
        # 1. Fetch HTML
        headers = {'User-Agent': USER_AGENT}
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        html = response.text

        # 2. Check for domain-specific config
        config = CrawlConfig.objects.filter(brand_domain=domain).first()

        description = ''
        highlights = []
        images = []

        # 3. Try CSS selectors if configured
        if config and (config.description_selector or config.gallery_selector):
            soup = BeautifulSoup(html, 'lxml')

            if config.description_selector:
                desc_el = soup.select_one(config.description_selector)
                if desc_el:
                    description = desc_el.get_text(strip=True)

            if config.highlights_selector:
                hl_els = soup.select(config.highlights_selector)
                highlights = [
                    el.get_text(strip=True)
                    for el in hl_els
                    if el.get_text(strip=True)
                ]

            if config.gallery_selector:
                img_els = soup.select(config.gallery_selector)
                images = [
                    el.get('src', '')
                    for el in img_els
                    if el.get('src')
                ]

        # 4. LLM fallback if selectors failed or not configured
        if (not description and not highlights) and (
            not config or config.use_llm_fallback
        ):
            extracted = _llm_extract(html[:MAX_HTML_FOR_LLM])
            description = extracted.get('description', '')
            highlights = extracted.get('highlights', [])
            if not images:
                images = extracted.get('images', [])

        # 5. Save crawled content
        crawled, _ = CrawledProductContent.objects.update_or_create(
            product=product,
            defaults={
                'crawl_url': url,
                'crawl_status': 'completed',
                'crawled_description': description,
                'crawled_highlights': highlights,
                'crawled_images': images,
                'raw_html': html[:MAX_RAW_HTML_LENGTH],
            },
        )

        # 6. Update product status
        Product.objects.filter(pk=product_id).update(crawl_status='completed')

        # 7. Re-index to OpenSearch
        try:
            from apps.common.opensearch_indexer import index_product
            index_product(product)
        except Exception as e:
            logger.warning('Failed to re-index product %s: %s', product_id, e)

        logger.info('Successfully crawled product %s from %s', product_id, url)
        return crawled

    except Exception as e:
        logger.exception('Crawl failed for product %s: %s', product_id, e)
        Product.objects.filter(pk=product_id).update(crawl_status='failed')
        CrawledProductContent.objects.update_or_create(
            product=product,
            defaults={
                'crawl_url': url,
                'crawl_status': 'failed',
                'raw_html': '',
            },
        )
        return None


def _llm_extract(html_text):
    """
    Use Bedrock (Claude) to extract structured product content from raw HTML.

    Args:
        html_text: Truncated HTML string from the product page.

    Returns:
        dict with keys 'description', 'highlights', 'images'.
    """
    try:
        client = BedrockClient()
        prompt = (
            'Extract product information from this HTML page content.\n'
            'Return a JSON object with:\n'
            '- "description": main product description text\n'
            '- "highlights": array of key feature/highlight bullet points\n'
            '- "images": array of product image URLs\n\n'
            f'HTML content (truncated):\n{html_text[:MAX_HTML_IN_PROMPT]}\n\n'
            'Return ONLY valid JSON.'
        )

        response_text = client.invoke(prompt, max_tokens=2048)
        return json.loads(response_text)
    except Exception as e:
        logger.warning('LLM extraction failed: %s', e)
        return {'description': '', 'highlights': [], 'images': []}
