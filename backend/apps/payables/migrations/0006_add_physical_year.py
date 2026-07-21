# Migration fixed: original 0006 referenced non-existent field and models
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("payables", "0001_initial"),
    ]

    operations = [
    ]