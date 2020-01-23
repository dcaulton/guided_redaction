import uuid
from django.db import models

class Job(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=36)
    owner = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    app = models.CharField(max_length=255)
    operation = models.CharField(max_length=255)
    sequence = models.IntegerField()
    elapsed_time = models.FloatField()
    file_uuids_used = models.TextField()
    request_data = models.TextField(null=True)
    response_data = models.TextField(null=True)
    parent = models.ForeignKey('Job', on_delete=models.CASCADE, null=True)
    workbook = models.ForeignKey('workbooks.Workbook', on_delete=models.CASCADE, null=True)

