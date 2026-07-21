from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
import io, csv

print('Starting E2E upload test')
client = APIClient()
resp = client.post('/api/auth/login/', {'username':'admin','password':'admin123'}, format='json')
print('LOGIN STATUS', resp.status_code)
print('LOGIN DATA', getattr(resp, 'data', None))
if resp.status_code != 200:
    raise SystemExit('Login failed')

token = resp.data.get('access')
client.credentials(HTTP_AUTHORIZATION='Bearer ' + token)

# Find existing company and client
from apps.companies.models import Company
from apps.clients.models import Client as ClientModel
comp = Company.objects.first()
cl = ClientModel.objects.first()
print('USING COMPANY', getattr(comp, 'company_code', None))
print('USING CLIENT', getattr(cl, 'client_code', None), getattr(cl, 'boid', None))

if not comp or not cl:
    raise SystemExit('No company or client available in DB')

rows = [['client_code','gross_interest','tax_amount','due_date','payment_status'],
        [cl.client_code or '', '1000', '100', '2025-07-01', 'Pending']]

s = io.StringIO()
writer = csv.writer(s)
for r in rows:
    writer.writerow(r)
content = s.getvalue().encode('utf-8')

uploaded = SimpleUploadedFile('test_interest.csv', content, content_type='text/csv')
response = client.post('/api/payables/interest/upload/', {'file': uploaded, 'company_code': comp.company_code, 'physical_year': '2025'}, format='multipart')
print('UPLOAD STATUS', response.status_code)
print('UPLOAD DATA', getattr(response, 'data', None))

# Verify created rows
from apps.payables.models import InterestPayable
q = InterestPayable.objects.filter(physical_year=2025)
print('CREATED_COUNT', q.count())
for obj in q.order_by('-interest_id')[:5]:
    print(obj.interest_id, obj.company.company_code, obj.client.client_code, obj.gross_interest, obj.physical_year)

# Also call the API list endpoint to verify the frontend would receive the field
api_resp = client.get('/api/payables/interest/?page_size=5')
print('API LIST STATUS', api_resp.status_code)
print('API LIST SAMPLE', api_resp.data.get('results', [])[:1])
