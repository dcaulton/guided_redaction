from server.router import get_router

from . import views

router = get_router()

router.register(
    r"v1/parse/split-and-hash-movie",
    views.ParseViewSetSplitAndHashMovie,
    basename="MaxHeadroom",
)
router.register(
    r"v1/parse/split-movie",
    views.ParseViewSetSplitMovie,
    basename="Lizzo",
)
router.register(
    r"v1/parse/make-url", views.ParseViewSetMakeUrl, basename="DustinDiamond"
)
router.register(
    r"v1/parse/zip-movie", views.ParseViewSetZipMovie, basename="MachoManRandySavage"
)
router.register(r"v1/parse/ping", views.ParseViewSetPing, basename="MarlinPerkins")
router.register(
    r"v1/parse/fetch-image", views.ParseViewSetFetchImage, basename="TonyClifton"
)
