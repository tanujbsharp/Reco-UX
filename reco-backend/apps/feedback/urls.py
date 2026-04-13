from django.urls import path
from apps.feedback import views

app_name = 'feedback'

urlpatterns = [
    path('feedback/', views.submit_feedback, name='submit_feedback'),
]
