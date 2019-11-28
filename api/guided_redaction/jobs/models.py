from django.db import models

class Job(models.Model):
    created_on = models.DateTimeField(auto_now_add=True)
    uuid = models.CharField(max_length=36)
    status = models.CharField(max_length=36)
    owner = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    app = models.CharField(max_length=255)
    operation = models.CharField(max_length=255)
    sequence = models.IntegerField()
    elapsed_time = models.FloatField()
    job_data = models.TextField()
    parent = models.ForeignKey('Job', on_delete=models.CASCADE, null=True)

