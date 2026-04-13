from django.urls import path
from apps.moderation import views

app_name = 'moderation'

urlpatterns = [
    path('moderation/docs/', views.upload_moderation_doc, name='upload_moderation_doc'),
    path('moderation/rules/', views.list_moderation_rules, name='list_moderation_rules'),
]
