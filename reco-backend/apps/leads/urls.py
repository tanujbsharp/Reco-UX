from django.urls import path
from apps.leads import views

app_name = 'leads'

urlpatterns = [
    path('handoff/', views.create_handoff, name='create_handoff'),
    path('handoff/pending', views.pending_handoffs, name='pending_handoffs'),
    path('share/email', views.share_email, name='share_email'),
    path('share/whatsapp', views.share_whatsapp, name='share_whatsapp'),
]
