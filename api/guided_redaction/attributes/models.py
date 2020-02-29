import uuid
from django.db import models
from guided_redaction.pipelines.models import Pipeline
from guided_redaction.jobs.models import Job
from guided_redaction.workbooks.models import Workbook
from guided_redaction.scanners.models import Scanner

class Attribute(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    scanner = models.ForeignKey(Scanner, on_delete=models.CASCADE, null=True)
    job = models.ForeignKey(Job, on_delete=models.CASCADE, null=True)
    workbook = models.ForeignKey(Workbook, on_delete=models.CASCADE, null=True)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, null=True)
