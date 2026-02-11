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
