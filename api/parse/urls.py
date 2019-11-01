from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('make_url', views.make_url, name='make_url'),
]
