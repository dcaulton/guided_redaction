import hashlib
import uuid
from django.conf import settings
from django.db import models
from guided_redaction.utils.classes.FileWriter import FileWriter
from guided_redaction.utils.external_payload_utils import (
    save_external_payloads,
    get_data_from_disk_for_model_instance,
    delete_external_payloads
)


class JobRunSummary(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey('jobs.Job', on_delete=models.CASCADE)
    job_eval_objective = models.ForeignKey('job_eval_objectives.JobEvalObjective', on_delete=models.CASCADE)
    summary_type = models.CharField(max_length=36)
    score = models.FloatField(default=0)
    content = models.TextField(null=True)
    content_path = models.CharField(max_length=255, null=True)
    content_checksum = models.CharField(max_length=255, null=True)

    EXTERNAL_PAYLOAD_FIELDS = ['content']
    MAX_DB_PAYLOAD_SIZE = 1000000

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
            'summary_type': self.summary_type,
            'score': str(self.score),
            'content': self.content,
        }
        return disp_hash

    def save(self, *args, **kwargs):
        save_external_payloads(self)
        super(JobRunSummary, self).save(*args, **kwargs)

    def delete(self):
        delete_external_payloads(self)
        super(JobRunSummary, self).delete()

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = cls(*values)
        get_data_from_disk_for_model_instance(instance)
        return instance
