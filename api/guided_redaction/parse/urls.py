from server.router import get_router

from . import api

router = get_router()

router.register(
    r"v1/parse/split-movie",
    api.ParseViewSetSplitMovie,
    basename="Lizzo",
)
router.register(
    r"v1/parse/hash-frames",
    api.ParseViewSetHashFrames,
    basename="CamilaCabello",
)
router.register(
    r"v1/parse/get-images-for-uuid",
    api.ParseViewSetGetImagesForUuid,
    basename="WierdAl",
)
router.register(
    r"v1/parse/make-url", api.ParseViewSetMakeUrl, basename="DustinDiamond"
)
router.register(
    r"v1/parse/zip-movie", api.ParseViewSetZipMovie, basename="MachoManRandySavage"
)
router.register(r"v1/parse/ping", api.ParseViewSetPing, basename="MarlinPerkins")
router.register(
    r"v1/parse/crop-image", api.ParseViewSetCropImage, basename="BillyBob"
)
