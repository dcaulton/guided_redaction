from server.router import get_router

from guided_redaction.jobs import views

router = get_router()

router.register(
    r"v1/jobs/", views.JobsViewSet, basename="DarylHammond"
)
