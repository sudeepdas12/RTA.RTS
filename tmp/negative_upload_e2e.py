import os
import requests

BASE_URL = os.environ.get('E2E_BASE_URL', 'http://localhost:8000')
USERNAME = os.environ.get('E2E_USERNAME', 'admin')
PASSWORD = os.environ.get('E2E_PASSWORD', 'admin123')
CSV_PATH = os.environ.get('SAMPLE_CSV', r'E:\\RTA.RTS\\tmp\\invalid_dividend_missing_columns.csv')


def fail(msg, code=1):
    print(msg)
    raise SystemExit(code)


def main():
    login = requests.post(
        f"{BASE_URL}/api/auth/login/",
        json={"username": USERNAME, "password": PASSWORD},
        timeout=30,
    )
    if login.status_code != 200:
        fail(f"login_failed status={login.status_code} body={login.text}")

    token = login.json().get('access')
    if not token:
        fail('login_failed no_access_token')

    headers = {'Authorization': f'Bearer {token}'}

    before = requests.get(f"{BASE_URL}/api/payables/dividend/", headers=headers, timeout=30)
    if before.status_code != 200:
        fail(f"before_list_failed status={before.status_code} body={before.text}")
    before_count = before.json().get('count', 0)

    with open(CSV_PATH, 'rb') as handle:
        upload = requests.post(
            f"{BASE_URL}/api/payables/dividend/upload/",
            headers=headers,
            files={'file': (os.path.basename(CSV_PATH), handle, 'text/csv')},
            timeout=60,
        )

    after = requests.get(f"{BASE_URL}/api/payables/dividend/", headers=headers, timeout=30)
    if after.status_code != 200:
        fail(f"after_list_failed status={after.status_code} body={after.text}")
    after_count = after.json().get('count', 0)

    print(f"before_count={before_count}")
    print(f"upload_status={upload.status_code}")
    print(f"upload_body={upload.text}")
    print(f"after_count={after_count}")
    print(f"delta={after_count - before_count}")

    if upload.status_code != 400:
        fail('expected_upload_status_400')

    if after_count != before_count:
        fail('count_changed_on_invalid_upload')

    print('negative_upload_e2e=PASSED')


if __name__ == '__main__':
    main()
