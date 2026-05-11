from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payables', '0003_institution_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='interestpayable',
            name='tax_exempted',
            field=models.BooleanField(default=False, help_text='True if client is tax exempt'),
        ),
    ]
