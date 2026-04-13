from django.urls import path
from apps.recommendations import views

app_name = 'recommendations'

urlpatterns = [
    path(
        'sessions/<int:session_id>/recommendations',
        views.get_recommendations,
        name='get_recommendations',
    ),
    path(
        'products/<int:product_id>',
        views.get_product_detail,
        name='get_product_detail',
    ),
]
