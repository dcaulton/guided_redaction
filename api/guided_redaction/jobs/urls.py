from server.router import get_router

from guided_redaction.jobs import api

router = get_router()

router.register(
    r"v1/jobs/", api.JobsViewSet, basename="DarylHammond"
)
