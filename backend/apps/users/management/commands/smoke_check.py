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

        import socket

        host = '127.0.0.1'
        port = 8000
        # endpoints: (method, path, acceptable_status_codes)
        endpoints = [
            ('GET', '/api/companies/', {200, 401, 403, 400}),
            ('GET', '/api/clients/', {200, 401, 403, 400}),
            # Root may intentionally return 404, or redirect to a UI (302)
            ('GET', '/', {200, 302, 404, 400}),
        ]

        errors = []
        for method, path, accepted in endpoints:
            try:
                with socket.create_connection((host, port), timeout=3) as s:
                    # send a minimal HTTP request with Host header
                    req = f"{method} {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
                    s.sendall(req.encode('utf-8'))
                    resp = s.recv(1024).decode('utf-8', errors='ignore')
                    # parse status line e.g. HTTP/1.1 200 OK
                    status_line = resp.splitlines()[0] if resp else ''
                    parts = status_line.split(' ')
                    status = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            except Exception as e:
                errors.append(f"{method} {path} -> ERROR: {str(e)}")
                continue

            if status not in accepted:
                errors.append(f"{method} {path} -> {status} (expected one of {sorted(accepted)})")
            else:
                self.stdout.write(self.style.SUCCESS(f"OK: {method} {path} -> {status}"))

        if errors:
            self.stderr.write('Smoke check failed for endpoints:')
            for e in errors:
                self.stderr.write(e)
            sys.exit(1)
        else:
            self.stdout.write(self.style.SUCCESS('All smoke checks passed.'))
