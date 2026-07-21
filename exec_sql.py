from django.db import connection
sqls = [
    "ALTER TABLE django_content_type ALTER COLUMN name DROP NOT NULL",
    "UPDATE django_content_type SET name = app_label || ' | ' || model WHERE name IS NULL"
]
with connection.cursor() as c:
    for s in sqls:
        try:
            c.execute(s)
            print(f"ok: {s}")
        except Exception as e:
            print(f"err: {s} {e}")
