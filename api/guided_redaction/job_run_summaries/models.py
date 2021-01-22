import uuid
from django.db import models

class JobRunSummary(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey('jobs.Job', on_delete=models.CASCADE)
    job_eval_objective = models.ForeignKey('job_eval_objectives.JobEvalObjective', on_delete=models.CASCADE)
    content = models.TextField(null=True)

    def __str__(self):
        self_hash = self.as_hash()
        self_hash['content'] = "{} bytes".format(len(self_hash['content']))
        return self_hash.__str__()

    def as_hash(self):
        disp_hash = {
            'id': str(self.id),
            'job_id': str(self.job.id),
            'job_eval_objective_id': str(self.job_eval_objective.id),
            'updated_on': str(self.updated_on),
            'content': self.content,
        }
        return disp_hash

