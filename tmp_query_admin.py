from psycopg import connect
cfg = dict(host='localhost', dbname='rta_rts_db', user='rta_user', password='rta123', port=5432)
with connect(**cfg) as conn:
    cur = conn.cursor()
    cur.execute("SELECT user_id, username, status, role_id, left(password_hash,60) FROM users WHERE username='admin'")
    row = cur.fetchone()
    if not row:
        print('NOT_FOUND')
    else:
        print('FOUND', row)
