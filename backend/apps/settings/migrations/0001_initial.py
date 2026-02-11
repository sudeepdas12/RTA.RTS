from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='FiscalYearSettings',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                ('fiscal_year', models.CharField(max_length=20)),
                (
                    'interest_rate',
                    models.DecimalField(
                        decimal_places=2,
                        default=7.0,
                        max_digits=5,
                    ),
                ),
                (
                    'tax_rate',
                    models.DecimalField(
                        decimal_places=2,
                        default=0.0,
                        max_digits=5,
                    ),
                ),
                ('is_active', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                (
                    'company',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='fiscal_year_settings',
                        to='companies.company',
                    ),
                ),
            ],
            options={
                'db_table': 'fiscal_year_settings',
                'ordering': ['-fiscal_year', 'company__company_name'],
                'unique_together': {('company', 'fiscal_year')},
                'verbose_name': 'Fiscal Year Setting',
                'verbose_name_plural': 'Fiscal Year Settings',
            },
        ),
    ]
