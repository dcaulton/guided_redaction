import uuid
from django.db import models

class JobEvalObjective(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.CharField(max_length=255)
    content = models.TextField(null=True)

    def __str__(self):
        disp_hash = {
            'id': str(self.id),
            'description': self.description,
            'updated_on': self.updated_on,
            'content': self.content,
        }
        return disp_hash.__str__()
