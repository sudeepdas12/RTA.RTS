from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='boid',
            field=models.CharField(max_length=50, null=True, blank=True, unique=True),
        ),
    ]
