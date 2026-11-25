import requests

BASE_URL = 'http://127.0.0.1:8000/api'

# 1. Login
login_res = requests.post(f'{BASE_URL}/auth/login', json={'email': 'doctor@demo.com', 'password': 'password'})
assert login_res.status_code == 200, f'Login failed: {login_res.text}'
token = login_res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print('[✓] Login successful')

# 2. Get a patient ID
patients_res = requests.get(f'{BASE_URL}/patients/', headers=headers)
assert patients_res.status_code == 200, f'Get patients failed: {patients_res.text}'
patient_id = patients_res.json()['items'][0]['id']
print(f'[✓] Using patient ID: {patient_id}')

# 3. Test Sample 1: Lab Report
lab_file_path = '../test/WhatsApp Image 2026-11-23 at 4.31.06 AM.jpeg'
with open(lab_file_path, 'rb') as f:
    upload_res = requests.post(
        f'{BASE_URL}/documents/upload/{patient_id}',
        headers=headers,
        files={'file': ('WhatsApp Image 2026-11-23 at 4.31.06 AM.jpeg', f, 'image/jpeg')},
        data={'category': 'radiology'}
    )
assert upload_res.status_code == 201, f'Upload failed: {upload_res.text}'
doc1_data = upload_res.json()
print(f"[✓] Lab Report uploaded: id={doc1_data['id']}, text_length={len(doc1_data.get('extracted_text', ''))}")

# Chat with Sample 1
chat_res1 = requests.post(
    f'{BASE_URL}/encounters/chat',
    headers=headers,
    json={
        'patient_id': patient_id,
        'document_ids': [doc1_data['id']],
        'prompt': 'Analyze uploaded laboratory report',
        'specialty': 'Radiology'
    }
)
assert chat_res1.status_code == 200, f'Chat 1 failed: {chat_res1.text}'
res1 = chat_res1.json()
print('\n=== SAMPLE 1 (LAB REPORT) VERIFICATION ===')
print('Title:', res1.get('title'))
print('Has Overview:', res1.get('overview') is not None)
print('Overview Timeline:', res1.get('overview', {}).get('timeline'))
print('Overview Summary:', res1.get('overview', {}).get('summary'))
print('Overview Next Steps:', res1.get('overview', {}).get('insights', {}).get('next_steps'))
print('Overview Disposition:', res1.get('overview', {}).get('insights', {}).get('disposition'))
print('\nHas Summary SOAP Note:', bool(res1.get('summary')))
print('Summary SOAP preview:\n', res1.get('summary')[:300])
print('\nHas Insights:', bool(res1.get('insights')))

# 4. Test Sample 2: Chest Radiograph Scan
scan_file_path = '../test/WhatsApp Image 2026-11-23 at 4.29.27 AM.jpeg'
with open(scan_file_path, 'rb') as f:
    upload_res2 = requests.post(
        f'{BASE_URL}/documents/upload/{patient_id}',
        headers=headers,
        files={'file': ('WhatsApp Image 2026-11-23 at 4.29.27 AM.jpeg', f, 'image/jpeg')},
        data={'category': 'radiology'}
    )
assert upload_res2.status_code == 201, f'Upload 2 failed: {upload_res2.text}'
doc2_data = upload_res2.json()
print(f"\n[✓] Chest Scan uploaded: id={doc2_data['id']}")

# Chat with Sample 2
chat_res2 = requests.post(
    f'{BASE_URL}/encounters/chat',
    headers=headers,
    json={
        'patient_id': patient_id,
        'document_ids': [doc2_data['id']],
        'prompt': 'Analyze chest radiograph scan',
        'specialty': 'Radiology'
    }
)
assert chat_res2.status_code == 200, f'Chat 2 failed: {chat_res2.text}'
res2 = chat_res2.json()
print('\n=== SAMPLE 2 (CHEST RADIOGRAPH SCAN) VERIFICATION ===')
print('Title:', res2.get('title'))
print('Has Overview:', res2.get('overview') is not None)
print('Overview Timeline:', res2.get('overview', {}).get('timeline'))
print('Overview Summary:', res2.get('overview', {}).get('summary'))
print('Overview Next Steps:', res2.get('overview', {}).get('insights', {}).get('next_steps'))
print('Overview Disposition:', res2.get('overview', {}).get('insights', {}).get('disposition'))
print('\nHas Summary SOAP Note:', bool(res2.get('summary')))
print('Summary SOAP preview:\n', res2.get('summary')[:300])
print('\nHas Insights:', bool(res2.get('insights')))

print('\n' + '='*50)
print('>>> SUCCESS: ALL TEST SAMPLES PROCESSED PERFECTLY <<<')
print('='*50)
