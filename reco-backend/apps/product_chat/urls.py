from django.urls import path
from apps.product_chat import views

app_name = 'product_chat'

urlpatterns = [
    path('chat/ask', views.ask, name='chat_ask'),
]
