from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payables', '0002_add_public_sector_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='interestpayable',
            name='tax_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True, help_text='Tax percentage'),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='remarks',
            field=models.TextField(blank=True, null=True),
        ),
    ]
