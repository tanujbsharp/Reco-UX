from django.apps import AppConfig


class CrawlAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.crawl'
    label = 'crawl'
    verbose_name = 'Web Crawling for Product Content'
