from django.contrib import admin
from django.urls import path
from django.urls import include

urlpatterns = [
    path('v1/analyze/', include('guided_redaction.analyze.urls')),
    path('v1/redact/', include('guided_redaction.redact.urls')),
    path('v1/parse/', include('guided_redaction.parse.urls')),
]
