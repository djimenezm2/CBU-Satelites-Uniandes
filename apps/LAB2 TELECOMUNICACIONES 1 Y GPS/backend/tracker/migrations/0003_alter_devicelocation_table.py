# Generated by Django 4.2 on 2025-02-20 03:22

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tracker', '0002_remove_devicelocation_id_and_more'),
    ]

    operations = [
        migrations.AlterModelTable(
            name='devicelocation',
            table='device_location',
        ),
    ]
