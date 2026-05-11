"""
E2E upload test script
Usage:
  python e2e_upload.py
Environment variables (optional):
  E2E_BASE_URL (default http://localhost:8000)
  E2E_USERNAME (default e2e_test)
  E2E_PASSWORD (default TestPass123!)
  SAMPLE_CSV (default sample_data/dividend_payables_sample.csv)
"""
import os
import sys
import requests

BASE_URL = os.environ.get('E2E_BASE_URL', 'http://localhost:8000')
USERNAME = os.environ.get('E2E_USERNAME', 'e2e_test')
PASSWORD = os.environ.get('E2E_PASSWORD', 'TestPass123!')
CSV_PATH = os.environ.get('SAMPLE_CSV', os.path.join(os.path.dirname(__file__), '..', 'sample_data', 'dividend_payables_sample.csv'))

def main():
    login_url = f"{BASE_URL}/api/auth/login/"
    upload_url = f"{BASE_URL}/api/payables/dividend/upload/"

    print('Using base URL:', BASE_URL)
    print('Logging in as', USERNAME)

    try:
        r = requests.post(login_url, json={'username': USERNAME, 'password': PASSWORD}, timeout=30)
        r.raise_for_status()
    except Exception as e:
        print('Login failed:', e)
        if r is not None:
            try:
                print('Response:', r.text)
            except Exception:
                pass
        sys.exit(1)

    data = r.json()
    token = data.get('access')
    if not token:
        print('No access token returned:', data)
        sys.exit(1)

    headers = {'Authorization': f'Bearer {token}'}
    print('Uploading file', CSV_PATH)
    try:
        with open(CSV_PATH, 'rb') as f:
            files = {'file': (os.path.basename(CSV_PATH), f, 'text/csv')}
            resp = requests.post(upload_url, headers=headers, files=files, timeout=60)
            resp.raise_for_status()
    except Exception as e:
        print('Upload failed:', e)
        try:
            print('Response:', resp.text)
        except Exception:
            pass
        sys.exit(1)

    print('Upload response:', resp.status_code)
    try:
        print(resp.json())
    except Exception:
        print(resp.text)

if __name__ == '__main__':
    main()
