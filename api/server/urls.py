from django.contrib import admin
from django.urls import path
from django.urls import include
from .router import get_router
import guided_redaction.analyze.urls
import guided_redaction.parse.urls
import guided_redaction.redact.urls
import guided_redaction.jobs.urls
import guided_redaction.workbooks.urls
import guided_redaction.link.urls
import guided_redaction.files.urls

router = get_router()

urlpatterns = [
  path('', include(router.urls)),
  path("api/", include(router.urls)),
]

