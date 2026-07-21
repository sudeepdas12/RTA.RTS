from django.db import migrations, models


class Migration(migrations.Migration):

    # DDL on MySQL must run outside transactions
    atomic = False

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        # boid field already exists in 0001_initial
    ]
