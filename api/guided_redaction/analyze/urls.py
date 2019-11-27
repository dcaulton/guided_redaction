from server.router import get_router

from . import views

router = get_router()

router.register(
    r"v1/analyze/east-tess", views.AnalyzeViewSetEastTess, basename="GeorgeCarlin"
)
router.register(
    r"v1/analyze/scan-template",
    views.AnalyzeViewSetScanTemplate,
    basename="GaryColeman",
)
router.register(
    r"v1/analyze/flood-fill", views.AnalyzeViewSetFloodFill, basename="RichardPryor"
)
router.register(
    r"v1/analyze/arrow-fill", views.AnalyzeViewSetArrowFill, basename="ReddFoxx"
)
