from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('scan_subimage', views.scan_subimage, name='scan_subimage'),

]
