from django.test import TestCase
from apps.companies.models import Company
from .models import Client
from .serializers import ClientSerializer


class ClientSerializerTests(TestCase):
    def setUp(self):
        self.company, _ = Company.objects.update_or_create(
            company_code='COMP001',
            defaults={
                'company_name': 'Test Corp',
                'sector_type': 'Public',
            },
        )
        self.client, _ = Client.objects.update_or_create(
            client_code='CL100',
            defaults={
                'full_name': 'Sample Client',
                'boid': 'BOID12345',
                'company': self.company,
            },
        )

    def test_serializer_includes_company_fields(self):
        serializer = ClientSerializer(self.client)
        data = serializer.data
        self.assertEqual(data['company'], self.company.company_id)
        self.assertEqual(data['company_name'], 'Test Corp')

    def test_create_client_with_company(self):
        data = {
            'client_code': 'CL200',
            'full_name': 'Another Client',
            'boid': 'BOID67890',
            'company': self.company.company_id,
        }
        serializer = ClientSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        client = serializer.save()
        self.assertEqual(client.company, self.company)
