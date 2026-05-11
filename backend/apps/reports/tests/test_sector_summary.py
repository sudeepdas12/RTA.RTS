from rest_framework.test import APITestCase
from apps.companies.models import Company
from apps.payables.models import InterestPayable

from apps.users.models import User, Role

class SectorSummaryTests(APITestCase):
    def setUp(self):
        # create admin user so permission checks pass
        role = Role.objects.create(role_name='Admin')
        self.user = User.objects.create(username='tester', role=role, password_hash='x')
        self.client.force_authenticate(user=self.user)

        # two companies with different sectors
        self.public = Company.objects.create(company_code='PUB', company_name='PublicCo', sector_type='Public')
        self.private = Company.objects.create(company_code='PRI', company_name='PrivateCo', sector_type='Private')

        # ensure clean slate for payables (keepdb leaves previous rows)
        InterestPayable.objects.all().delete()

        # create a generic client since InterestPayable requires it
        from apps.clients.models import Client
        self.dummy_client = Client.objects.create(client_code='CL1', full_name='Dummy', boid='BOID1', company=self.public)

        # one payable each
        InterestPayable.objects.create(
            company=self.public,
            client=self.dummy_client,
            gross_interest=100,
            tax_amount=10,
            net_payable=90,
            due_date='2023-08-01'
        )
        InterestPayable.objects.create(
            company=self.private,
            client=self.dummy_client,
            gross_interest=200,
            tax_amount=20,
            net_payable=180,
            due_date='2023-08-05'
        )

    def test_sector_summary_returns_aggregates(self):
        url = '/api/reports/sector-summary/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        data = resp.data
        self.assertIn('rows', data)
        self.assertIn('totals', data)
        sectors = {r['sector'] for r in data['rows']}
        self.assertEqual(sectors, {'Public', 'Private'})
        self.assertEqual(data['totals']['gross'], 300)
        self.assertEqual(data['totals']['tax'], 30)
        self.assertEqual(data['totals']['net'], 270)

    def test_sector_summary_filters_by_company_name(self):
        url = '/api/reports/sector-summary/'
        resp = self.client.get(url, {'company_name': 'PublicCo'})
        self.assertEqual(resp.status_code, 200)
        data = resp.data
        self.assertEqual(len(data['rows']), 1)
        self.assertEqual(data['rows'][0]['sector'], 'Public')
        self.assertEqual(data['totals']['gross'], 100)
        self.assertEqual(data['totals']['tax'], 10)
        self.assertEqual(data['totals']['net'], 90)

    def test_export_sector_summary_returns_excel(self):
        url = '/api/reports/export/sector-summary/'
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', resp['Content-Type'])
