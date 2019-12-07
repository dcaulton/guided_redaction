from server.router import get_router

from . import api

router = get_router()

router.register(
    r"v1/analyze/east-tess", api.AnalyzeViewSetEastTess, basename="GeorgeCarlin"
)
router.register(
    r"v1/analyze/scan-template",
    api.AnalyzeViewSetScanTemplate,
    basename="GaryColeman",
)
router.register(
    r"v1/analyze/flood-fill", api.AnalyzeViewSetFloodFill, basename="RichardPryor"
)
router.register(
    r"v1/analyze/arrow-fill", api.AnalyzeViewSetArrowFill, basename="ReddFoxx"
)
