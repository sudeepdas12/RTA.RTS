from psycopg import connect
from django.contrib.auth.hashers import check_password
cfg = dict(host='localhost', dbname='rta_rts_db', user='rta_user', password='rta123', port=5432)
with connect(**cfg) as conn:
    cur = conn.cursor()
    cur.execute("SELECT password_hash FROM users WHERE username='admin'")
    row = cur.fetchone()
    if not row:
        print('NOT_FOUND')
    else:
        pw_hash = row[0]
        print('HASH:', pw_hash[:80])
        print('CHECK admin123 ->', check_password('admin123', pw_hash))
        print('CHECK admin/admin ->', check_password('admin', pw_hash))
