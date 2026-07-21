from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Company',
            fields=[
                (
                    'company_id',
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('company_code', models.CharField(max_length=20, unique=True)),
                ('company_name', models.CharField(max_length=200)),
                ('sector_type', models.CharField(blank=True, choices=[('Public', 'Public'), ('Private', 'Private')], max_length=50, null=True)),
                ('interest_tax_status', models.CharField(blank=True, choices=[('Taxable', 'Taxable'), ('Exempted', 'Exempted')], max_length=50, null=True)),
                ('pan_no', models.CharField(blank=True, max_length=50, null=True)),
                ('bank_account_no', models.CharField(blank=True, max_length=50, null=True)),
                ('bank_name', models.CharField(blank=True, max_length=100, null=True)),
                ('status', models.CharField(choices=[('Active', 'Active'), ('Inactive', 'Inactive')], default='Active', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'companies',
                'ordering': ['company_code'],
                'verbose_name_plural': 'Companies',
            },
        ),
    ]