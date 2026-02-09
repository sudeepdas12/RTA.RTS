from django.core.management.base import BaseCommand
from django.test import Client
import json


class Command(BaseCommand):
    help = 'Run end-to-end checks against key API endpoints with Nepal sample data'

    def handle(self, *args, **options):
        client = Client()
        results = {}

        login_response = client.post(
            '/api/auth/login/',
            json.dumps({'username': 'admin', 'password': 'admin123'}),
            content_type='application/json',
        )
        results['login_status'] = login_response.status_code
        if login_response.status_code != 200:
            self.stdout.write(self.style.ERROR('Login failed. Cannot proceed with E2E tests.'))
            self.stdout.write(login_response.content.decode())
            return

        access = login_response.json().get('access')
        headers = {'HTTP_AUTHORIZATION': f'Bearer {access}'}

        endpoints = {
            'companies': {'url': '/api/companies/'},
            'clients': {'url': '/api/clients/'},
            'users': {'url': '/api/users/'},
            'roles': {'url': '/api/users/roles/'},
            'interest_payables': {'url': '/api/payables/interest/'},
            'dividend_payables': {'url': '/api/payables/dividend/'},
            'bank_statements': {'url': '/api/reconciliation/bank-statements/'},
            'bank_transactions': {'url': '/api/reconciliation/bank-transactions/'},
            'reconciliations': {'url': '/api/reconciliation/'},
            'audit_logs': {'url': '/api/audit/'},
            'reports_dashboard': {'url': '/api/reports/dashboard/', 'type': 'dashboard'},
        }

        for name, meta in endpoints.items():
            response = client.get(meta['url'], **headers)
            entry = {'status': response.status_code}
            results[name] = entry

            if response.status_code != 200:
                entry['error'] = response.content.decode(errors='replace')[:1000]
                continue

            try:
                payload = response.json()
            except Exception:
                entry['error'] = 'Invalid JSON response'
                continue

            entry['count'] = self._infer_count(payload)

            if meta.get('type') == 'dashboard':
                entry['summary'] = {
                    'interest_total_net': payload.get('interest', {}).get('total_net'),
                    'dividend_total_net': payload.get('dividend', {}).get('total_net'),
                    'companies': payload.get('total_companies'),
                    'clients': payload.get('total_clients'),
                }
            else:
                preview = self._extract_preview(payload)
                if preview:
                    entry['preview'] = preview

        self.stdout.write(self.style.SUCCESS('E2E Test Results:'))
        output = json.dumps(results, indent=2, default=str)
        self.stdout.write(output)
        with open('/tmp/e2e_results.json', 'w') as handle:
            handle.write(output)

    def _infer_count(self, payload):
        if isinstance(payload, list):
            return len(payload)
        if isinstance(payload, dict):
            if 'results' in payload and isinstance(payload['results'], list):
                return len(payload['results'])
            if isinstance(payload.get('count'), int):
                return payload['count']
        return None

    def _extract_preview(self, payload):
        if isinstance(payload, list) and payload:
            return payload[:2]
        if isinstance(payload, dict):
            results = payload.get('results')
            if isinstance(results, list) and results:
                return results[:2]
        return None
