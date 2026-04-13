"""
Root URL configuration for Bsharp Reco.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('login/', include('apps.converse_auth.urls')),
    path('users/', include('apps.converse_auth.urls_users')),
    # API endpoints (will be populated as phases are built)
    path('api/', include('apps.sessions_app.urls')),
    path('api/', include('apps.customers.urls')),
    path('api/', include('apps.voice.urls')),
    path('api/', include('apps.questions.urls')),
    path('api/', include('apps.recommendations.urls')),
    path('api/', include('apps.comparisons.urls')),
    path('api/', include('apps.product_chat.urls')),
    path('api/', include('apps.feedback.urls')),
    path('api/', include('apps.leads.urls')),
    path('api/', include('apps.packets.urls')),
    path('api/', include('apps.analytics.urls')),
    path('api/', include('apps.moderation.urls')),
    path('api/', include('apps.crawl.urls')),
]
