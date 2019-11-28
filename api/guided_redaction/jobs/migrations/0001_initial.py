import django.contrib.auth.models                                               
import django.contrib.auth.validators                                           
from django.db import migrations, models                                        
import django.utils.timezone                                                    
                                                                                
                                                                                
class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Job",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("uuid", models.CharField(max_length=36)),
                ("status", models.CharField(max_length=36)),
                ("owner", models.CharField(max_length=255)),
                ("description", models.CharField(max_length=255)),
                ("created_on", models.DateTimeField(auto_now_add=True)),
                ("app", models.CharField(max_length=255)),
                ("operation", models.CharField(max_length=255)),
                ("sequence", models.IntegerField(default=0)),
                ("elapsed_time", models.FloatField()),
                ("file_uuids_used", models.TextField()),
                ("request_data", models.TextField(null=True)),
                ("response_data", models.TextField(null=True)),
                ("parent", models.ForeignKey('self', on_delete=models.CASCADE, null=True)),
            ]
        )
    ]

