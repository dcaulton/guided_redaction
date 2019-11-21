import django.contrib.auth.models                                               
import django.contrib.auth.validators                                           
from django.db import migrations, models                                        
import django.utils.timezone                                                    
                                                                                
                                                                                
class Migration(migrations.Migration):                                          
                                                                                
    initial = True                                                              
                                                                                
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="ImageBlob",
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
                ("asset_type", models.CharField(max_length=20)),
                ("file_name", models.CharField(max_length=255)),
                ("image_data", models.BinaryField()),
            ]
        )
    ]

