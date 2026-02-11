from django.test import TestCase

class CompaniesBasicTests(TestCase):
    def test_anonymous_get_companies_returns_401_or_403(self):
        resp = self.client.get('/api/companies/')
        self.assertIn(resp.status_code, (401, 403))
