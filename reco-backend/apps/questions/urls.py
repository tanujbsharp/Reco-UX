from django.urls import path
from . import views

app_name = 'questions'

urlpatterns = [
    path('sessions/<int:session_id>/questions/', views.get_first_question, name='get_first_question'),
    path('sessions/<int:session_id>/answer', views.submit_answer, name='submit_answer'),
]
