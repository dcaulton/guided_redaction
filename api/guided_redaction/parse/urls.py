from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('ping', views.ping, name='ping'),
    path('make_url', views.make_url, name='make_url'),
    path('zip_movie', views.zip_movie, name='zip_movie'),
    path('asset/<the_uuid>/<the_image_name>', views.fetch_image, name='fetch_image'),
]
