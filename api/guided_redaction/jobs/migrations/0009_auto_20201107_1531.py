# Generated by Django 2.2.6 on 2020-11-07 15:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0008_auto_20201105_2213'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='request_data_path',
            field=models.CharField(max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='response_data_path',
            field=models.CharField(max_length=255, null=True),
        ),
    ]
