from django.apps import AppConfig


class ProductChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.product_chat'
    label = 'product_chat'
    verbose_name = 'Product Chatbot (RAG)'
