from django.db import migrations
from django.db import connection


def add_company_id_mysql(apps, schema_editor):
    db_name = connection.ops.quote_name(connection.settings_dict.get('NAME'))
    with connection.cursor() as cur:
        # Check if column exists
        cur.execute("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=%s AND table_name=%s AND column_name=%s", (connection.settings_dict.get('NAME'), 'fiscal_year_settings', 'company_id'))
        if cur.fetchone()[0] == 0:
            cur.execute("ALTER TABLE fiscal_year_settings ADD COLUMN company_id INT NULL")

        # Add foreign key if not exists
        cur.execute("SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_schema=%s AND table_name=%s AND column_name=%s AND referenced_table_name IS NOT NULL", (connection.settings_dict.get('NAME'), 'fiscal_year_settings', 'company_id'))
        if cur.fetchone()[0] == 0:
            try:
                cur.execute("ALTER TABLE fiscal_year_settings ADD CONSTRAINT fiscal_year_settings_company_id_fk FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE")
            except Exception:
                # ignore if cannot add constraint (e.g., companies table missing during early deploy)
                pass

        # Add unique index on (company_id, fiscal_year) if not exists
        cur.execute("SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=%s AND table_name=%s AND index_name=%s", (connection.settings_dict.get('NAME'), 'fiscal_year_settings', 'fiscal_year_settings_company_fiscal_year_uniq'))
        if cur.fetchone()[0] == 0:
            try:
                cur.execute("ALTER TABLE fiscal_year_settings ADD UNIQUE INDEX fiscal_year_settings_company_fiscal_year_uniq (company_id, fiscal_year)")
            except Exception:
                pass


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0004_alter_fiscalyearsettings_company_and_more'),
    ]

    operations = [
        migrations.RunPython(add_company_id_mysql, noop_reverse),
    ]
