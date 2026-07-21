#!/bin/sh
# enable execution trace and exit on errors to make startup failures visible in logs
set -ex

# Wait for DB using the active Django settings/database backend.
# We run migrations directly so startup matches the standard
# Django/PostgreSQL runtime configuration.
for i in $(seq 1 60); do
  if python manage.py migrate --noinput >/dev/null 2>&1; then
    echo "Database available"
    break
  fi
  echo "Waiting for database..."
  sleep 1
done

if [ $? -ne 0 ]; then
  echo 'Database did not become available in time'
  exit 1
fi

python manage.py set_admin_password \
  --username "${ADMIN_USERNAME:-admin}" \
  --password "${ADMIN_PASSWORD:-admin123}" \
  --email "${ADMIN_EMAIL:-admin@rta.gov.np}" \
  --full-name "${ADMIN_FULL_NAME:-System Administrator}"
python manage.py collectstatic --noinput

exec "$@"
