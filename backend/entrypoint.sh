#!/bin/sh
# enable execution trace and exit on errors to make startup failures visible in logs
set -ex

# Wait for DB (docker-compose ensures healthy db, but this is a safety net)
# Try connecting until it works (retry loop using python exit code)
for i in $(seq 1 60); do
  python - <<PY
import os, sys, traceback
try:
    import psycopg
    conn = psycopg.connect(host=os.environ.get('DB_HOST', 'db'),
                           user=os.environ.get('DB_USER', 'rta_user'),
                           password=os.environ.get('DB_PASSWORD', 'password'),
                           dbname=os.environ.get('DB_NAME', 'rta_rts_db'),
                           port=os.environ.get('DB_PORT', '5432'))
    conn.close()
    print('Database connection OK')
except Exception:
    traceback.print_exc()
    sys.exit(1)
sys.exit(0)
PY
  if [ $? -eq 0 ]; then
    echo "Database available"
    break
  fi
  echo "Waiting for database..."
  sleep 1
done

# verify final state
if [ $? -ne 0 ]; then
  echo 'Database did not become available in time'
  exit 1
fi

# Run migrations, collectstatic, then run the CMD
python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
