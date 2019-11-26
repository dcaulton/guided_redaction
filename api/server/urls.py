from django.contrib import admin
from django.urls import path
from django.urls import include
from rest_framework import routers
import guided_redaction.analyze.views
import guided_redaction.parse.views
import guided_redaction.redact.views

router = routers.DefaultRouter()
router.register(r'v1/analyze/east-tess', 
    guided_redaction.analyze.views.AnalyzeViewSetEastTess, basename='GeorgeCarlin')
router.register(r'v1/analyze/scan-template', 
    guided_redaction.analyze.views.AnalyzeViewSetScanTemplate, basename='GaryColeman')
router.register(r'v1/analyze/flood-fill', 
    guided_redaction.analyze.views.AnalyzeViewSetFloodFill, basename='RichardPryor')
router.register(r'v1/analyze/arrow-fill', 
    guided_redaction.analyze.views.AnalyzeViewSetArrowFill, basename='ReddFoxx')
router.register(r'v1/parse/split-and-hash-movie', 
    guided_redaction.parse.views.ParseViewSetSplitAndHashMovie, basename='MaxHeadroom')
router.register(r'v1/parse/make-url', 
    guided_redaction.parse.views.ParseViewSetMakeUrl, basename='DustinDiamond')
router.register(r'v1/parse/zip-movie', 
    guided_redaction.parse.views.ParseViewSetZipMovie, basename='MachoManRandySavage')
router.register(r'v1/parse/ping', 
    guided_redaction.parse.views.ParseViewSetPing, basename='MarlinPerkins')
router.register(r'v1/parse/fetch-image', 
    guided_redaction.parse.views.ParseViewSetFetchImage, basename='TonyClifton')
router.register(r'v1/redact/redact-image', 
    guided_redaction.redact.views.RedactViewSetRedactImage, basename='DerekZoolander')

urlpatterns = [
    path('', include(router.urls)),
]
