FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Use bookworm + security repos (avoid bookworm-updates which gets 403 from CDN)
# Only install libpq-dev (psycopg[binary] uses pre-compiled wheels, no gcc needed)
RUN printf 'Types: deb\nURIs: http://deb.debian.org/debian\nSuites: bookworm\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n\nTypes: deb\nURIs: http://deb.debian.org/debian-security\nSuites: bookworm-security\nComponents: main\nSigned-By: /usr/share/keyrings/debian-archive-keyring.gpg\n' > /etc/apt/sources.list.d/debian.sources && \
    apt-get update -o Acquire::Retries=3 && apt-get install -y --no-install-recommends libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --upgrade pip && pip install -r /app/requirements.txt

# Copy project
COPY . /app

# Create entrypoint
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i -e 's/\r$//' /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Collect static files when building (optional, also done at runtime)
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
