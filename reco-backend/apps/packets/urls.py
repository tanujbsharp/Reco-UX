from django.urls import path
from apps.packets import views

app_name = 'packets'

urlpatterns = [
    path('packets/', views.packet_list, name='packet_list'),
    path('packets/<int:packet_id>/', views.packet_detail, name='packet_detail'),
    path('packets/<int:packet_id>/upload-products/', views.upload_products, name='upload_products'),
]
