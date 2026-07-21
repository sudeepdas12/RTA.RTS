"""Upload the actual PRIME Excel file with smart sheet-name detection"""
import urllib.request
import json

# Login
login_data = json.dumps({'username': 'admin', 'password': 'admin123'}).encode()
login_req = urllib.request.Request('http://localhost:8000/api/auth/login/', data=login_data, headers={'Content-Type': 'application/json'})
login_resp = urllib.request.urlopen(login_req)
login_result = json.loads(login_resp.read())
token = login_result.get('token') or login_result.get('access')
print('Logged in successfully')

# Read the file
file_path = 'test_upload.xlsx'
with open(file_path, 'rb') as f:
    file_content = f.read()

# Build multipart form data
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = b''
fields = {
    'company_code': 'PRIME',
    'company_name': 'Prime Commercial Bank',
    'interest_rate': '8.75',
    'tax_rate': '6.00',
    'period_from': '2025-07-17',
    'period_to': '2026-01-14',
    'period_days': '182',
}
for name, value in fields.items():
    body += f'--{boundary}\r\n'.encode()
    body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
    body += f'{value}\r\n'.encode()

body += f'--{boundary}\r\n'.encode()
body += f'Content-Disposition: form-data; name="file"; filename="PRIME_8.75_POUSH_END_2082.xlsx"\r\n'.encode()
body += 'Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n'.encode()
body += file_content
body += f'\r\n--{boundary}--\r\n'.encode()

# Upload
upload_req = urllib.request.Request(
    'http://localhost:8000/api/payables/debenture/upload/',
    data=body,
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': f'multipart/form-data; boundary={boundary}',
    }
)
upload_resp = urllib.request.urlopen(upload_req)
result = json.loads(upload_resp.read())
print('Upload status:', upload_resp.status)
print('Response:', json.dumps(result, indent=2))