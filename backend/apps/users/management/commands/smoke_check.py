from django.core.management.base import BaseCommand
from django.test import Client
import sys

class Command(BaseCommand):
    help = 'Run simple smoke checks against local API endpoints'

    def handle(self, *args, **options):
        from django.conf import settings

        # Ensure 'testserver' is allowed for requests made by the test client
        if 'testserver' not in getattr(settings, 'ALLOWED_HOSTS', []):
            settings.ALLOWED_HOSTS = list(getattr(settings, 'ALLOWED_HOSTS', [])) + ['testserver']

        client = Client()
        endpoints = [
            ('GET', '/api/companies/'),
            ('GET', '/api/clients/'),
            ('GET', '/'),
        ]

        errors = []
        for method, url in endpoints:
            if method == 'GET':
                # Set HTTP_HOST to localhost to avoid DisallowedHost during tests
                resp = client.get(url, HTTP_HOST='localhost')
            else:
                resp = None

            status = getattr(resp, 'status_code', None)
            # Accept 200, 302 (root redirect), 401/403 for protected endpoints
            if status not in (200, 302, 401, 403):
                errors.append(f"{method} {url} -> {status}")
            else:
                self.stdout.write(self.style.SUCCESS(f"OK: {method} {url} -> {status}"))

        if errors:
            self.stderr.write('Smoke check failed for endpoints:')
            for e in errors:
                self.stderr.write(e)
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS('All smoke checks passed.'))
