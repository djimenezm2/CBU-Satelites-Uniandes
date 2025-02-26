from django.urls import path
from . import views

urlpatterns = [
    path('wipe/', views.wipe_database, name='wipe_database'),
]
