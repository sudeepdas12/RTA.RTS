import os

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connections
from django.db.migrations.executor import MigrationExecutor
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = 'Run deployment readiness checks for security, DB state, and migration consistency.'

    def handle(self, *args, **options):
        errors = []
        warnings = []

        if settings.DEBUG:
            errors.append('DEBUG is enabled. Set DEBUG=False for deployment.')

        secret_key = getattr(settings, 'SECRET_KEY', '') or ''
        if len(secret_key) < 32:
            errors.append('SECRET_KEY is too short. Use at least 32 characters.')

        allowed_hosts = list(getattr(settings, 'ALLOWED_HOSTS', []))
        if not allowed_hosts:
            errors.append('ALLOWED_HOSTS is empty.')
        if '*' in allowed_hosts:
            warnings.append('ALLOWED_HOSTS contains wildcard *; restrict this for production.')

        cors_origins = list(getattr(settings, 'CORS_ALLOWED_ORIGINS', []))
        if not cors_origins:
            warnings.append('CORS_ALLOWED_ORIGINS is empty; verify cross-origin requirements.')

        for env_name in ('DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT'):
            if not os.environ.get(env_name):
                errors.append(f'Missing required environment variable: {env_name}')

        try:
            connection = connections['default']
            connection.ensure_connection()
        except OperationalError as exc:
            errors.append(f'Database connection failed: {exc}')
        else:
            try:
                executor = MigrationExecutor(connections['default'])
                plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
                if plan:
                    errors.append('Unapplied migrations detected. Run manage.py migrate.')
            except Exception as exc:
                errors.append(f'Could not validate migration state: {exc}')

        self.stdout.write('\nDeployment Readiness Report')
        self.stdout.write('===========================')

        if warnings:
            self.stdout.write('\nWarnings:')
            for warning in warnings:
                self.stdout.write(f'  - {warning}')

        if errors:
            self.stdout.write('\nErrors:')
            for error in errors:
                self.stdout.write(f'  - {error}')
            self.stdout.write(self.style.ERROR('\nReadiness check FAILED.'))
            raise SystemExit(1)

        self.stdout.write(self.style.SUCCESS('\nReadiness check PASSED.'))
