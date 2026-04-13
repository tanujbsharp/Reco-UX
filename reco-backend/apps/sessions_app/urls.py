from django.urls import path
from . import views

app_name = 'sessions_app'
urlpatterns = [
    path('sessions/', views.create_session, name='create_session'),
    path('sessions/<int:session_id>/', views.session_detail, name='session_detail'),
]
