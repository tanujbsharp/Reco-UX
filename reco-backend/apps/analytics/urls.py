from django.urls import path
from apps.analytics import views

app_name = 'analytics'

urlpatterns = [
    path('analytics/overview', views.analytics_overview, name='analytics_overview'),
]
