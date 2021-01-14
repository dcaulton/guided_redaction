import uuid
from django.db import models

class JobRunSummary(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey('jobs.Job', on_delete=models.CASCADE, null=True)
    job_eval_objective = models.ForeignKey('job_eval_objectives.JobEvalObjective', on_delete=models.CASCADE, null=True)
    content = models.TextField(null=True)

    def __str__(self):
        disp_hash = {
            'id': str(self.id),
            'job_id': self.job.id,
            'job_eval_objective_id': self.job_eval_objective.id,
            'updated_on': self.updated_on,
            'content': self.content,
        }
        return disp_hash.__str__()
