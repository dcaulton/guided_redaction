# Generated by Django 2.2.6 on 2020-11-09 17:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0010_auto_20201109_1754'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='request_data_checksum',
            field=models.CharField(max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='job',
            name='response_data_checksum',
            field=models.CharField(max_length=255, null=True),
        ),
    ]