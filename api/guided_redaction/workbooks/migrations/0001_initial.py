import django.contrib.auth.models                                               
import django.contrib.auth.validators                                           
from django.db import migrations, models                                        
import django.utils.timezone                                                    
import uuid
                                                                                
                                                                                
class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Workbook",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)),
                ("file_uuids_used", models.TextField()),
                ("updated_on", models.DateTimeField(auto_now=True)),
                ("owner", models.CharField(max_length=255)),
                ("name", models.CharField(max_length=255)),
                ("state_data", models.TextField(null=True)),
            ]
        )
    ]

