from server.router import get_router

from guided_redaction.job_eval_objectives import api

router = get_router()

router.register(
    r"v1/job-eval-objectives", api.JobEvalObjectivesViewSet, basename="SamuelDavisElSegundo"
)
