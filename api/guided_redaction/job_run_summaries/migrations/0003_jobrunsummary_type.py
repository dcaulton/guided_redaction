# Generated by Django 2.2.6 on 2021-01-22 23:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('job_run_summaries', '0002_auto_20210117_1538'),
    ]

    operations = [
        migrations.AddField(
            model_name='jobrunsummary',
            name='type',
            field=models.CharField(default='', max_length=36),
            preserve_default=False,
        ),
    ]
