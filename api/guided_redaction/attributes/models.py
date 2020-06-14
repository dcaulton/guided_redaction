import uuid
from django.db import models

class Attribute(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    scanner = models.ForeignKey('scanners.Scanner', on_delete=models.CASCADE, null=True)
    job = models.ForeignKey('jobs.Job', on_delete=models.CASCADE, null=True)
    workbook = models.ForeignKey('workbooks.Workbook', on_delete=models.CASCADE, null=True)
    pipeline = models.ForeignKey('pipelines.Pipeline', on_delete=models.CASCADE, null=True)
