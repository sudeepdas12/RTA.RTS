from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0002_add_boid_field'),
        # companies app table should already exist via schema or prior migrations
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='company',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='clients',
                to='companies.company',
            ),
        ),
    ]
