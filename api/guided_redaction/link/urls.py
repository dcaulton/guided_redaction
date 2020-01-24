from server.router import get_router

from . import api

router = get_router()

router.register(r"v1/link/learn-dev", api.LinkViewSetLearnDev, basename="Esteban")
router.register(r"v1/link/junk-sniffer", api.LinkViewSetJunkSniffer, basename="Beto")
router.register(r"v1/link/can-reach", api.LinkViewSetCanReach, basename="CharleyCorn")
