from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('scan_template', views.scan_template, name='scan_template'),
    path('flood_fill', views.flood_fill, name='flood_fill'),
    path('arrow_fill', views.arrow_fill, name='arrow_fill'),

]
