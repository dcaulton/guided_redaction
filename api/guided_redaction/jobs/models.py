import uuid
from django.db import models

class Job(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=36)
    description = models.CharField(max_length=255)
    app = models.CharField(max_length=255)
    operation = models.CharField(max_length=255)
    sequence = models.IntegerField()
    percent_complete = models.FloatField(default=0)
    request_data = models.TextField(null=True)
    response_data = models.TextField(null=True)
    parent = models.ForeignKey('Job', on_delete=models.CASCADE, null=True)
    workbook = models.ForeignKey('workbooks.Workbook', on_delete=models.CASCADE, null=True)

    segment_time_fractions = {
      'split_and_hash_threaded': {},
      '': {},
      '': {},
      '': {},
    }
    def __str__(self):
        disp_hash = {
            'id': str(self.id),
            'status': self.status,
            'app': self.app,
            'operation': self.operation,
            'parent_id': str(self.parent_id),
        }
        return disp_hash.__str__()

    def update_percent_complete(self, percent_complete=None):
        self.percent_complete = percent_complete
