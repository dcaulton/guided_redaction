import uuid
from django.db import models

class Scanner(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=64)
    description = models.CharField(max_length=255)
    content = models.TextField(null=True)
