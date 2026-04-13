from django.urls import path

from apps.comparisons import views

app_name = 'comparisons'

urlpatterns = [
    path('comparisons/', views.compare_products_view, name='compare_products'),
]
