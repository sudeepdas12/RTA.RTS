from psycopg import connect, OperationalError
cfg = dict(host='localhost', dbname='rta_rts_db', user='rta_user', password='rta123', port=5432)
try:
    conn = connect(**cfg)
    cur = conn.cursor()
    cur.execute('SELECT 1')
    print('CONNECTED', cur.fetchone())
    cur.execute("SELECT count(*) FROM pg_tables WHERE schemaname='public'")
    print('Public tables:', cur.fetchone())
    cur.close()
    conn.close()
except OperationalError as e:
    print('OP_ERR', e)
except Exception as e:
    print('ERR', e)
