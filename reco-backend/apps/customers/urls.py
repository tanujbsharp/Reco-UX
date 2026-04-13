from django.urls import path
from . import views

app_name = 'customers'
urlpatterns = [
    path('customers/', views.capture_customer, name='capture_customer'),
]
