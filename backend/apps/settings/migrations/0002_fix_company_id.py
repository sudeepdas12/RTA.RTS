from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('settings', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'fiscal_year_settings'
          AND column_name = 'company_id'
    ) THEN
        ALTER TABLE fiscal_year_settings ADD COLUMN company_id integer;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'fiscal_year_settings'
          AND column_name = 'company_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM fiscal_year_settings WHERE company_id IS NULL
        ) THEN
            ALTER TABLE fiscal_year_settings ALTER COLUMN company_id SET NOT NULL;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fiscal_year_settings_company_id_fk'
    ) THEN
        ALTER TABLE fiscal_year_settings
            ADD CONSTRAINT fiscal_year_settings_company_id_fk
            FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fiscal_year_settings_company_fiscal_year_uniq'
    ) THEN
        ALTER TABLE fiscal_year_settings
            ADD CONSTRAINT fiscal_year_settings_company_fiscal_year_uniq
            UNIQUE (company_id, fiscal_year);
    END IF;
END $$;
""",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
