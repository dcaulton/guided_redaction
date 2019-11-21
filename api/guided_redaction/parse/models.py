from django.db import models

class ImageBlob(models.Model):
    asset_type = models.CharField(max_length=20)
    created_on = models.DateTimeField(auto_now_add=True)
    uuid = models.CharField(max_length=36)
    file_name = models.CharField(max_length=200)
    image_data = models.BinaryField()

