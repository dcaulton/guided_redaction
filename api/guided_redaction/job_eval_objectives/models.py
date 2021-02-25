import uuid
from django.db import models

class JobEvalObjective(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    description = models.CharField(max_length=255)
    content = models.TextField(null=True)

    def __str__(self):
        return self.as_dict().__str__()

    def as_dict(self):
        build_content = str(self.content or '{}')

        jrs_data = {
            'id': str(self.id),
            'description': self.description,
            'updated_on': str(self.updated_on),
            'content': build_content,
        }
        return jrs_data
