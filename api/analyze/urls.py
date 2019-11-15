from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('scan_subimage', views.scan_subimage, name='scan_subimage'),
    path('flood_fill', views.flood_fill, name='flood_fill'),
    path('arrow_fill', views.arrow_fill, name='arrow_fill'),

]
