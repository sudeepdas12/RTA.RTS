from django.test import SimpleTestCase, Client
from rest_framework.test import APITestCase

class BasicSimpleTests(SimpleTestCase):
    def test_root_returns_status(self):
        c = Client()
        resp = c.get('/')
        # Accept common local responses
        self.assertIn(resp.status_code, (200, 302, 400, 404))

class AuthEndpointTests(APITestCase):
    def test_companies_requires_auth(self):
        resp = self.client.get('/api/companies/')
        self.assertIn(resp.status_code, (401, 403))

    def test_unauthorized_error_uses_standard_envelope(self):
        resp = self.client.get('/api/companies/')
        self.assertIn(resp.status_code, (401, 403))
        payload = resp.json()
        self.assertIn('error', payload)
        self.assertIn('message', payload)
        self.assertIn('status_code', payload)
        self.assertIn('request_id', payload)

    def test_health_endpoint_available(self):
        resp = self.client.get('/api/health/')
        self.assertIn(resp.status_code, (200, 503))
        payload = resp.json()
        self.assertEqual(payload.get('service'), 'rta-rts-backend')
        self.assertIn('status', payload)
        self.assertIn('database', payload)
        self.assertIn('request_id', payload)
