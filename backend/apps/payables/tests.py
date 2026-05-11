from django.test import SimpleTestCase
from apps.payables.serializers import InterestPayableSerializer, DividendPayableSerializer
from apps.payables.models import InterestPayable, DividendPayable
from apps.companies.models import Company
from apps.clients.models import Client
from django.utils import timezone

class PayablesSerializerTests(SimpleTestCase):
    def setUp(self):
        # create minimal in-memory model instances (no DB required)
        self.company = Company(company_code='C001', company_name='Test Co')
        self.sample_client = Client(client_code='CL001', full_name='Client One', boid='BOID-CL001')

        self.interest = InterestPayable(
            company=self.company,
            client=self.sample_client,
            instrument_ref='REF1',
            gross_interest=100,
            tax_amount=10,
            net_payable=90,
            due_date=timezone.now().date()
        )
        self.dividend = DividendPayable(
            company=self.company,
            client=self.sample_client,
            shares_held=100,
            gross_dividend=1000,
            tax_amount=100,
            net_payable=900,
            fiscal_year='2025/26'
        )

    def test_interest_serializer_includes_client_boid(self):
        data = InterestPayableSerializer(self.interest).data
        self.assertIn('client_boid', data)
        self.assertEqual(data['client_boid'], 'BOID-CL001')

    def test_dividend_serializer_includes_client_boid(self):
        data = DividendPayableSerializer(self.dividend).data
        self.assertIn('client_boid', data)
        self.assertEqual(data['client_boid'], 'BOID-CL001')
