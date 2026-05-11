from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payables', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='interestpayable',
            name='allotted_quantity',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='principal_amount',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='interest_rate',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='interest_per_day',
            field=models.DecimalField(blank=True, decimal_places=4, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='interest_pumori',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=15, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='bank_code',
            field=models.CharField(blank=True, max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='bank_name',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='account_number',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='lot',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='interestpayable',
            name='approved_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
