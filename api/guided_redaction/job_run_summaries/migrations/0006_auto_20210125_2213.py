# Generated by Django 2.2.6 on 2021-01-25 22:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('job_run_summaries', '0005_jobrunsummary_score'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobrunsummary',
            name='content_data_checksum',
            field=models.CharField(max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='jobrunsummary',
            name='content_data_path',
            field=models.CharField(max_length=255, null=True),
        ),
    ]