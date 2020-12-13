from server.router import get_router

from . import api

router = get_router()

router.register(
    r"v1/analyze/get-screens", api.AnalyzeViewSetGetScreens, basename="CousinGeri"
)
