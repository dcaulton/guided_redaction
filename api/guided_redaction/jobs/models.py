from django.db import models

class JobData(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    uuid = models.CharField(max_length=36)
    status = models.CharField(max_length=36)
    owner = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    job_data = models.TextField()

