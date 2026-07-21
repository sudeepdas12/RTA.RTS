import urllib.request
import json
import os

def post_multipart(url, fields, files, headers={}):
    boundary = '----Boundary'
    body = []
    for name, value in fields.items():
        body.append('--' + boundary)
        body.append('Content-Disposition: form-data; name="' + name + '"')
        body.append('')
        body.append(value)
    for name, filepath in files.items():
        body.append('--' + boundary)
        filename = os.path.basename(filepath)
        body.append('Content-Disposition: form-data; name="' + name + '"; filename="' + filename + '"')
        body.append('Content-Type: application/octet-stream')
        body.append('')
        with open(filepath, 'rb') as f:
            body.append(f.read())
    body.append('--' + boundary + '--')
    body.append('')
    
    flattened_body = b''
    for part in body:
        if isinstance(part, str):
            flattened_body += (part + '\r\n').encode()
        else:
            flattened_body += part + b'\r\n'
            
    req = urllib.request.Request(url, data=flattened_body, headers={**headers, 'Content-Type': 'multipart/form-data; boundary=' + boundary}, method='POST')
    try:
        with urllib.request.urlopen(req) as f:
            return f.status, json.loads(f.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())

token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc4NjAzMzkxLCJpYXQiOjE3Nzg1NzQ1OTEsImp0aSI6IjYxNjgwMjJjOGNiMTQ5NGE5ZmE4NzA2ZTEwNjgzYjU3IiwidXNlcl9pZCI6MSwidXNlcm5hbWUiOiJhZG1pbiJ9.I5rs-m3i6l4qcdor-M41FATxyLgN_1pu6FYxONo4Y5w'
headers = {'Authorization': 'Bearer ' + token}
status, res = post_multipart('http://localhost:8000/api/allocations/allocations/upload/', 
                             {'category': 'LOCAL'}, 
                             {'file': '/app/sample_data/local_allocations.iaf'}, 
                             headers)
print('Status: ' + str(status))
print(json.dumps(res, indent=2))
