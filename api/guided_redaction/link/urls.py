from server.router import get_router

from . import api

router = get_router()

router.register(r"v1/link/learn", api.LinkViewSetLearn, basename="Esteban")
router.register(r"v1/link/junk-sniffer", api.LinkViewSetJunkSniffer, basename="Beto")
router.register(r"v1/link/can-reach", api.LinkViewSetCanReach, basename="CharleyCorn")
router.register(r"v1/link/get-telemetry-rows", api.LinkViewSetGetTelemetryRows, basename="MisterGarrison")
