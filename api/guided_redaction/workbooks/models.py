import uuid
from django.db import models

class Workbook(models.Model):
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    owner = models.CharField(max_length=255)
    file_uuids_used = models.TextField()
    state_data = models.TextField(null=True)

