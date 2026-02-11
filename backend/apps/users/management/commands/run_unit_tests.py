from django.core.management.base import BaseCommand
import importlib
import unittest
import sys

MODULES_TO_RUN = [
    'apps.users.tests',
    'apps.companies.tests',
    'backend.apps.companies.tests.test_smoke',
]

class Command(BaseCommand):
    help = 'Run selected unit tests directly (workaround for discovery issues)'

    def handle(self, *args, **options):
        loader = unittest.TestLoader()
        suite = unittest.TestSuite()
        for mod in MODULES_TO_RUN:
            try:
                imported = importlib.import_module(mod)
                suite.addTests(loader.loadTestsFromModule(imported))
                self.stdout.write(self.style.SUCCESS(f'Loaded tests from {mod}'))
            except Exception as e:
                self.stderr.write(self.style.ERROR(f'Could not load {mod}: {e}'))

        runner = unittest.TextTestRunner(verbosity=2)
        result = runner.run(suite)
        if not result.wasSuccessful():
            sys.exit(1)
        self.stdout.write(self.style.SUCCESS('Selected unit tests passed.'))