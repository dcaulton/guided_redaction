# Generated by Django 2.2.6 on 2020-01-23 16:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('jobs', '0002_auto_20191231_1705'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='updated',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
