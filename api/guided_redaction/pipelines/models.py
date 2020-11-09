import uuid
from django.db import models
from guided_redaction.attributes.models import Attribute


class Pipeline(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    content = models.TextField(null=True)

    def as_dict(self):
        build_attributes = {}
        if Attribute.objects.filter(pipeline=self).exists():
            attributes = Attribute.objects.filter(pipeline=self)
            for attribute in attributes:
                build_attributes[attribute.name] = attribute.value
        p_data = {
            'id': str(self.id),
            'name': self.name,
            'description': self.description,
            'created_on': str(self.created_on),
            'updated_on': str(self.updated_on),
            'attributes': build_attributes,
            'content': self.content,
        }
        return p_data
