from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('settings', '0002_fix_company_id'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fiscal_year_settings_fiscal_year_key'
    ) THEN
        ALTER TABLE fiscal_year_settings
            DROP CONSTRAINT fiscal_year_settings_fiscal_year_key;
    END IF;
END $$;
""",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
