# Generated by Django 2.2.6 on 2020-02-25 19:37

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workbooks', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='workbook',
            name='file_uuids_used',
        ),
    ]
