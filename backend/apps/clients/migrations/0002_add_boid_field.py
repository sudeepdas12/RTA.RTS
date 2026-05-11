from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
    ]

    def add_boid_column(apps, schema_editor):
        # Use raw SQL to create column only if it doesn't exist, avoiding duplicate errors
        sql = """
        ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS boid varchar(50) NULL UNIQUE;
        """
        schema_editor.execute(sql)

    operations = [
        migrations.RunPython(add_boid_column, reverse_code=migrations.RunPython.noop),
    ]
