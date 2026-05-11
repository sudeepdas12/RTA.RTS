from rest_framework.test import APITestCase
from apps.companies.models import Company
from .models import Client

class ClientFilterTests(APITestCase):
    def setUp(self):
        self.company1 = Company.objects.create(company_code='C1', company_name='Comp1')
        self.company2 = Company.objects.create(company_code='C2', company_name='Comp2')
        Client.objects.create(client_code='CL1', full_name='Client 1', boid='BOID1', company=self.company1)
        Client.objects.create(client_code='CL2', full_name='Client 2', boid='BOID2', company=self.company2)
        Client.objects.create(client_code='CL3', full_name='Client 3', boid='BOID3')

    def test_company_filter(self):
        url = '/api/clients/'
        self.client.force_authenticate(user=None)  # anonymous should get 401
        resp = self.client.get(url)
        self.assertIn(resp.status_code, (401,403))

        # create an admin user via helper or bypass permissions
        from apps.users.management.commands.set_admin_password import Command
        # simpler: create user directly
        from apps.users.models import User, Role
        role = Role.objects.create(role_name='Admin')
        user = User.objects.create(username='testuser', role=role, password_hash='x')
        self.client.force_authenticate(user=user)

        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 3)

        resp = self.client.get(url, {'company': self.company1.company_id})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['company'], self.company1.company_id)
