from rest_framework.test import APITestCase

class CompanySmokeTests(APITestCase):
    def test_anonymous_cannot_list_companies(self):
        """Anonymous requests to list companies should be rejected (401)."""
        resp = self.client.get('/api/companies/')
        # DRF returns 401 for unauthenticated requests when IsAuthenticated used
        self.assertIn(resp.status_code, (401, 403))
