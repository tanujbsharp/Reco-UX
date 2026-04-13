from django.contrib import admin

from apps.crawl.models import CrawledProductContent, CrawlConfig


@admin.register(CrawledProductContent)
class CrawledProductContentAdmin(admin.ModelAdmin):
    list_display = ('crawl_id', 'product', 'crawl_url', 'crawl_status', 'created_at')
    list_filter = ('crawl_status',)
    search_fields = ('crawl_url', 'product__product_code')
    readonly_fields = ('created_at',)


@admin.register(CrawlConfig)
class CrawlConfigAdmin(admin.ModelAdmin):
    list_display = ('config_id', 'brand_domain', 'use_llm_fallback')
    search_fields = ('brand_domain',)
