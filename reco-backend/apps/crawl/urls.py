from django.urls import path

from apps.crawl import views

app_name = 'crawl'

urlpatterns = [
    path('crawl/product/<int:product_id>', views.trigger_crawl, name='trigger_crawl'),
]
