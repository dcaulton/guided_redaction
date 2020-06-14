# Generated by Django 2.2.6 on 2020-06-14 15:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0005_remove_job_owner'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='job',
            name='elapsed_time',
        ),
        migrations.AddField(
            model_name='job',
            name='percent_complete',
            field=models.FloatField(default=0),
        ),
    ]
