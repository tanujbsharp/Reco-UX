"""
Crawl models for Bsharp Reco.

Stores crawled product page content and per-domain crawl configurations.

CrawledProductContent — extracted description, highlights, images from a product URL.
CrawlConfig — CSS selectors and LLM fallback settings per brand domain.

Ref: Phase 15 — Web Crawling and Content Enrichment.
"""
from django.db import models


class CrawledProductContent(models.Model):
    crawl_id = models.AutoField(primary_key=True)
    product = models.ForeignKey(
        'packets.Product',
        on_delete=models.CASCADE,
        related_name='crawled_content',
    )
    crawl_url = models.URLField()
    crawl_status = models.CharField(
        max_length=20,
        default='pending',
    )  # pending, completed, failed
    crawled_description = models.TextField(blank=True)
    crawled_highlights = models.JSONField(default=list)
    crawled_images = models.JSONField(default=list)
    raw_html = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'crawled_product_content'

    def __str__(self):
        return f'Crawl {self.crawl_id} — {self.crawl_url} [{self.crawl_status}]'


class CrawlConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    brand_domain = models.CharField(max_length=255, unique=True)
    description_selector = models.CharField(max_length=255, blank=True)  # CSS selector
    gallery_selector = models.CharField(max_length=255, blank=True)
    highlights_selector = models.CharField(max_length=255, blank=True)
    use_llm_fallback = models.BooleanField(default=True)

    class Meta:
        db_table = 'crawl_configs'

    def __str__(self):
        return f'CrawlConfig for {self.brand_domain}'
