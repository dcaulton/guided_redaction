import uuid
from django.db import models

class Attribute(models.Model):

    class Meta:
        default_related_name = "attributes"

    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    scanner = models.ForeignKey('scanners.Scanner', on_delete=models.CASCADE, null=True)
    job = models.ForeignKey('jobs.Job', on_delete=models.CASCADE, null=True)
    job_run_summary = models.ForeignKey('job_run_summaries.JobRunSummary', on_delete=models.CASCADE, null=True)
    job_eval_objective = models.ForeignKey('job_eval_objectives.JobEvalObjective', on_delete=models.CASCADE, null=True)
    workbook = models.ForeignKey('workbooks.Workbook', on_delete=models.CASCADE, null=True)
    pipeline = models.ForeignKey('pipelines.Pipeline', on_delete=models.CASCADE, null=True)

    def __str__(self):
        disp_hash = {
            'id': str(self.id),
            'name': self.name,
            'value': self.value,
            'job_id': str(self.job.id),
            'scanner_id': str(self.scanner.id),
            'job_run_summary_id': str(self.job_run_summary.id),
            'job_eval_objective_id': str(self.job_eval_objective.id),
            'workbook_id': str(self.workbook.id),
            'pipeline_id': str(self.pipeline.id),
        }
        return disp_hash.__str__()
