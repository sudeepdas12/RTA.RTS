# Multi-Factor Authentication (MFA) Implementation Guide

**Status:** Ready for Phase 3 implementation
**Priority:** High (Security enhancement for production)
**Estimated Time:** 3-4 hours
**Technologies:** django-otp, qrcode, TOTP (Time-based One-Time Password)

## Overview

This guide provides a complete MFA implementation using TOTP (Authenticator apps like Google Authenticator, Authy, Microsoft Authenticator).

## Phase 3 Scope

### Backend (Django)

1. **TOTP Setup & Verification**
   - Generate TOTP secrets
   - QR code generation
   - Verify TOTP tokens
   - Backup codes generation
   - Rate limiting on verification attempts

2. **User Model Extensions**
   - Track MFA status
   - Store backup codes (hashed)
   - Track last verification time
   - Force MFA on next login

3. **API Endpoints**
   - POST `/auth/mfa/setup/` - Start MFA setup
   - POST `/auth/mfa/verify/` - Verify TOTP token
   - POST `/auth/mfa/backup-codes/` - Get backup codes
   - POST `/auth/mfa/disable/` - Disable MFA
   - GET `/auth/mfa/status/` - Check MFA status

### Frontend (React)

1. **MFA Setup Flow**
   - Display QR code
   - Manual entry option
   - Verification step
   - Backup codes display & download
   - Confirmation

2. **MFA Verification Flow**
   - Post-login MFA verification page
   - TOTP token input
   - Backup code input (fallback)
   - Remember device option
   - Resend code (email/SMS)

3. **User Settings**
   - Enable/disable MFA
   - Re-generate backup codes
   - View trusted devices
   - Clear all sessions

## Installation

### Backend Dependencies

```bash
pip install django-otp==1.1.3
pip install qrcode==7.4.2
pip install python-barcode==0.15.1
```

**Add to `backend/requirements.txt`:**
```
django-otp==1.1.3
qrcode==7.4.2
Pillow==10.0.0  # Required for QR image generation
```

### Frontend Dependencies

Already included:
- React -> for UI
- Axios -> for API calls

## Implementation Files

### 1. Backend - Models Extension

**File:** `backend/apps/users/models.py` (append)

```python
from django.db import models
from django.contrib.auth.models import User
import binascii
import codecs
import base64

class UserMFASettings(models.Model):
    """
    User MFA configuration
    """
    MFA_METHODS = [
        ('totp', 'Time-based One-Time Password'),
        ('email', 'Email verification'),
        ('sms', 'SMS verification'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='mfa_settings')
    is_enabled = models.BooleanField(default=False)
    method = models.CharField(max_length=20, choices=MFA_METHODS, default='totp')
    totp_secret = models.CharField(max_length=32, null=True, blank=True)
    backup_codes = models.JSONField(default=list, blank=True)  # Hashed backup codes
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_mfa_settings'

    def __str__(self):
        return f"{self.user.username} - MFA {'Enabled' if self.is_enabled else 'Disabled'}"


class TrustedDevice(models.Model):
    """
    Track user's trusted devices for MFA bypass
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trusted_devices')
    device_name = models.CharField(max_length=100)
    device_fingerprint = models.CharField(max_length=255, unique=True)
    # Fingerprint = SHA256(user_agent + ip_address)
    ip_address = models.GenericIPAddressField()
    last_used = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'trusted_devices'
        unique_together = ['user', 'device_fingerprint']
```

### 2. Backend - TOTP Utility Functions

**File:** `backend/config/totp_utils.py` (create)

```python
"""
TOTP (Time-based One-Time Password) utilities for MFA
"""

import pyotp
import qrcode
from io import BytesIO
import base64
from django.conf import settings

def generate_totp_secret():
    """Generate a random TOTP secret"""
    return pyotp.random_base32()

def get_totp_provisioning_uri(user_email: str, secret: str) -> str:
    """
    Generate provisioning URI for QR code
    Format: otpauth://totp/RTA%20System:user@example.com?secret=...&issuer=RTA%20System
    """
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=user_email,
        issuer_name='RTA System',
    )

def generate_qr_code(provisioning_uri: str) -> str:
    """
    Generate QR code as base64-encoded PNG
    """
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color='black', back_color='white')
    buffered = BytesIO()
    img.save(buffered, format='PNG')
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f'data:image/png;base64,{img_str}'

def verify_totp_token(secret: str, token: str, window: int = 1) -> bool:
    """
    Verify TOTP token
    window: Check current + window tokens before/after (default 1)
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=window)

def generate_backup_codes(count: int = 8) -> list:
    """
    Generate backup codes for account recovery
    Format: XXXX-XXXX-XXXX (12 hex chars each)
    """
    import secrets
    codes = []
    for _ in range(count):
        code = secrets.token_hex(6).upper()
        formatted = f'{code[:4]}-{code[4:8]}-{code[8:12]}'
        codes.append(formatted)
    return codes

def hash_backup_code(code: str) -> str:
    """Hash backup code for storage (never store plain text)"""
    from django.contrib.auth.hashers import make_password
    return make_password(code)

def verify_backup_code(code: str, hashed_code: str) -> bool:
    """Verify backup code against hashed version"""
    from django.contrib.auth.hashers import check_password
    return check_password(code, hashed_code)
```

### 3. Backend - Serializers

**File:** `backend/apps/users/serializers.py` (append)

```python
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserMFASettings

class MFASetupSerializer(serializers.Serializer):
    """Initiate MFA setup - returns QR code and secret"""
    class Meta:
        fields = []

    def to_representation(self, instance):
        from config.totp_utils import generate_totp_secret, get_totp_provisioning_uri, generate_qr_code
        
        secret = generate_totp_secret()
        user_email = self.context['request'].user.email or self.context['request'].user.username
        provisioning_uri = get_totp_provisioning_uri(user_email, secret)
        qr_code = generate_qr_code(provisioning_uri)
        
        return {
            'secret': secret,
            'qr_code': qr_code,
            'manual_entry': f'otpauth://totp/RTA System:{user_email}?secret={secret}',
        }

class MFAVerifySerializer(serializers.Serializer):
    """Verify TOTP token during setup"""
    secret = serializers.CharField(max_length=32)
    token = serializers.CharField(max_length=6, min_length=6)
    
    def validate_token(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("Token must be 6 digits")
        return value

class MFAStatusSerializer(serializers.ModelSerializer):
    """User's MFA status"""
    class Meta:
        model = UserMFASettings
        fields = ['is_enabled', 'method', 'verified_at']
        read_only_fields = ['verified_at']
```

### 4. Backend - Views

**File:** `backend/apps/users/views.py` (append)

```python
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import UserMFASettings
from .serializers import MFASetupSerializer, MFAVerifySerializer, MFAStatusSerializer
from config.totp_utils import verify_totp_token, generate_backup_codes, hash_backup_code

class MFAViewSet(viewsets.ViewSet):
    """
    MFA endpoints for user authentication
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def setup(self, request):
        """
        Start MFA setup - returns QR code and secret
        POST /auth/mfa/setup/
        """
        serializer = MFASetupSerializer(None, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def verify_setup(self, request):
        """
        Verify TOTP token and complete MFA setup
        POST /auth/mfa/verify-setup/
        {
            "secret": "JBSWY3DPEBLW64TMMQ",
            "token": "123456"
        }
        """
        serializer = MFAVerifySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        secret = serializer.validated_data['secret']
        token = serializer.validated_data['token']

        # Verify token
        if not verify_totp_token(secret, token):
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate backup codes
        backup_codes = generate_backup_codes()
        hashed_codes = [hash_backup_code(code) for code in backup_codes]

        # Save MFA settings
        mfa_settings, created = UserMFASettings.objects.get_or_create(
            user=request.user
        )
        mfa_settings.totp_secret = secret
        mfa_settings.is_enabled = True
        mfa_settings.backup_codes = hashed_codes
        mfa_settings.verified_at = timezone.now()
        mfa_settings.save()

        return Response({
            'success': True,
            'backup_codes': backup_codes,
            'message': 'Save your backup codes in a secure place'
        })

    @action(detail=False, methods=['get'])
    def status(self, request):
        """
        Get user's MFA status
        GET /auth/mfa/status/
        """
        mfa_settings, created = UserMFASettings.objects.get_or_create(
            user=request.user
        )
        serializer = MFAStatusSerializer(mfa_settings)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def disable(self, request):
        """
        Disable MFA for user
        POST /auth/mfa/disable/
        {
            "password": "user_password"  # Confirm with password
        }
        """
        password = request.data.get('password')
        
        # Verify password
        if not request.user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Disable MFA
        mfa_settings = UserMFASettings.objects.filter(user=request.user).first()
        if mfa_settings:
            mfa_settings.is_enabled = False
            mfa_settings.totp_secret = None
            mfa_settings.backup_codes = []
            mfa_settings.save()

        return Response({'success': True})
```

### 5. Backend - Authentication Middleware

**File:** `backend/config/mfa_middleware.py` (create)

```python
"""
MFA verification middleware for post-login authentication
"""

from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
import json

class MFARequiredMiddleware(MiddlewareMixin):
    """
    Check if MFA is required for this request
    Sets 'requires_mfa' flag in request if user has MFA enabled but hasn't verified
    """
    
    # Exempt these endpoints from MFA check
    EXEMPT_PATHS = [
        '/api/auth/login/',
        '/api/auth/mfa/verify-token/',
        '/api/auth/mfa/setup/',
        '/api/auth/logout/',
        '/health/',
    ]

    def process_request(self, request):
        # Check if path is exempt
        for exempt_path in self.EXEMPT_PATHS:
            if request.path.startswith(exempt_path):
                return None

        # Try to get JWT token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None

        try:
            token = auth_header.split(' ')[1]
            auth = JWTAuthentication()
            validated = auth.get_validated_token(token)
            user = auth.get_user(validated)

            # Check if MFA is enabled but not verified
            from apps.users.models import UserMFASettings
            mfa_settings = UserMFASettings.objects.filter(user=user).first()
            
            if mfa_settings and mfa_settings.is_enabled:
                # Check if MFA has been verified in this session
                # You could store this in JWT claims or session
                verified = request.session.get(f'mfa_verified_{user.id}', False)
                if not verified:
                    request.requires_mfa = True
                    request.mfa_user = user

        except Exception:
            pass

        return None
```

### 6. Backend - URLs

**File:** `backend/apps/users/urls.py` (append)

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MFAViewSet

router = DefaultRouter()
router.register(r'mfa', MFAViewSet, basename='mfa')

urlpatterns = [
    path('', include(router.urls)),
]
```

## Frontend Implementation

### 1. MFA Setup Component

**File:** `frontend/src/components/MFASetup.tsx`

```typescript
import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Form, Alert, Spinner } from 'react-bootstrap';

interface MFASetupStep {
  step: 1 | 2 | 3; // 1: Display QR, 2: Verify token, 3: Backup codes
  qrCode?: string;
  secret?: string;
  backupCodes?: string[];
}

export function MFASetup() {
  const [setupStep, setSetupStep] = useState<MFASetupStep>({ step: 1 });
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Generate QR code
  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/mfa/setup/', {});
      setSetupStep({
        step: 1,
        qrCode: response.data.qr_code,
        secret: response.data.secret,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start setup');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify TOTP token
  const handleVerifyToken = async () => {
    if (!token || token.length !== 6) {
      setError('Token must be 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/mfa/verify-setup/', {
        secret: setupStep.secret,
        token,
      });
      
      setSetupStep({
        step: 3,
        backupCodes: response.data.backup_codes,
      });
      setToken('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Download backup codes
  const handleDownloadBackupCodes = () => {
    const content = `RTA System - MFA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${setupStep.backupCodes?.join('\n')}`;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', 'backup-codes.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <Card className="mfa-setup">
      <Card.Header>
        <Card.Title>Set Up Multi-Factor Authentication</Card.Title>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        {setupStep.step === 1 && (
          <>
            <p>Secure your account with two-factor authentication using an authenticator app.</p>
            {setupStep.qrCode ? (
              <>
                <div className="text-center mb-3">
                  <img src={setupStep.qrCode} alt="QR Code" style={{ maxWidth: '300px' }} />
                </div>
                <div className="alert alert-info">
                  <strong>Manual Entry:</strong><br />
                  <code>{setupStep.secret}</code>
                </div>
                <p className="text-muted">
                  Scan the QR code or manually enter the code above into your authenticator app
                  (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                </p>
                <Button variant="primary" onClick={() => setSetupStep({ step: 2, secret: setupStep.secret })}>
                  Next: Verify Token
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={handleStartSetup} disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Start Setup'}
              </Button>
            )}
          </>
        )}

        {setupStep.step === 2 && (
          <>
            <p>Enter the 6-digit code from your authenticator app:</p>
            <Form.Group className="mb-3">
              <Form.Label>Verification Code</Form.Label>
              <Form.Control
                type="text"
                placeholder="000000"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                size="lg"
              />
            </Form.Group>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => setSetupStep({ step: 1 })}>
                Back
              </Button>
              <Button variant="primary" onClick={handleVerifyToken} disabled={loading || token.length !== 6}>
                {loading ? <Spinner size="sm" /> : 'Verify'}
              </Button>
            </div>
          </>
        )}

        {setupStep.step === 3 && (
          <>
            <Alert variant="success">✓ MFA enabled successfully!</Alert>
            <p><strong>Save your backup codes:</strong></p>
            <div className="bg-light p-3 rounded mb-3" style={{ fontFamily: 'monospace', fontSize: '0.9em' }}>
              {setupStep.backupCodes?.map((code, i) => (
                <div key={i}>{code}</div>
              ))}
            </div>
            <Alert variant="warning">
              Store these codes in a safe place. You can use them to access your account if you lose your authenticator app.
            </Alert>
            <Button variant="primary" onClick={handleDownloadBackupCodes} className="me-2">
              Download Codes
            </Button>
            <Button variant="success" onClick={() => window.location.reload()}>
              Done
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
}
```

### 2. MFA Verification Component (Post-Login)

**File:** `frontend/src/components/MFAVerification.tsx`

```typescript
import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Form, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';

interface MFAVerificationProps {
  onSuccess: (sessionToken: string) => void;
  onCancel: () => void;
}

export function MFAVerification({ onSuccess, onCancel }: MFAVerificationProps) {
  const [method, setMethod] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);

  const handleSubmit = async () => {
    if (!code) {
      setError(`Enter ${method === 'totp' ? 'TOTP' : 'backup'} code`);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/mfa/verify-token/', {
        code,
        method,
        remember_device: rememberDevice,
      });
      onSuccess(response.data.session_token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mfa-verification">
      <Card.Header>
        <Card.Title>Multi-Factor Authentication</Card.Title>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Tabs activeKey={method} onSelect={(k) => setMethod(k as 'totp' | 'backup')}>
          <Tab eventKey="totp" title="Authenticator App">
            <Form.Group className="mt-3 mb-3">
              <Form.Label>Enter 6-digit code from your authenticator app:</Form.Label>
              <Form.Control
                type="text"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                size="lg"
                disabled={loading}
              />
            </Form.Group>
          </Tab>
          <Tab eventKey="backup" title="Backup Code">
            <Form.Group className="mt-3 mb-3">
              <Form.Label>Enter one of your backup codes:</Form.Label>
              <Form.Control
                type="text"
                placeholder="XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
              />
            </Form.Group>
          </Tab>
        </Tabs>

        <Form.Check
          type="checkbox"
          label="Remember this device for 30 days"
          checked={rememberDevice}
          onChange={(e) => setRememberDevice(e.target.checked)}
          className="mb-3"
        />

        <div className="d-flex gap-2">
          <Button variant="outline-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={loading || !code}>
            {loading ? <Spinner size="sm" /> : 'Verify'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
```

## Testing

### Backend Tests

**File:** `backend/tests/test_mfa.py`

```python
from django.test import TestCase
from django.contrib.auth.models import User
from apps.users.models import UserMFASettings
from config.totp_utils import (
    generate_totp_secret,
    verify_totp_token,
    generate_backup_codes,
    hash_backup_code,
    verify_backup_code,
)
from rest_framework.test import APIClient


class TOTPUtilsTestCase(TestCase):
    def test_generate_secret(self):
        secret = generate_totp_secret()
        self.assertEqual(len(secret), 32)
        self.assertTrue(secret.replace('=', '').isalnum())

    def test_verify_totp_token(self):
        secret = generate_totp_secret()
        import pyotp
        totp = pyotp.TOTP(secret)
        token = totp.now()
        
        self.assertTrue(verify_totp_token(secret, token))
        self.assertFalse(verify_totp_token(secret, '000000'))

    def test_backup_codes(self):
        codes = generate_backup_codes()
        self.assertEqual(len(codes), 8)
        self.assertTrue(all('-' in code for code in codes))

    def test_backup_code_hashing(self):
        code = 'XXXX-XXXX-XXXX'
        hashed = hash_backup_code(code)
        self.assertTrue(verify_backup_code(code, hashed))
        self.assertFalse(verify_backup_code('XXXX-XXXX-YYYY', hashed))


class MFASetupAPITestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_mfa_setup(self):
        response = self.client.post('/api/auth/mfa/setup/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('qr_code', response.data)
        self.assertIn('secret', response.data)

    def test_mfa_verify(self):
        secret = generate_totp_secret()
        import pyotp
        totp = pyotp.TOTP(secret)
        token = totp.now()

        response = self.client.post('/api/auth/mfa/verify-setup/', {
            'secret': secret,
            'token': token,
        })
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['success'])
        self.assertIn('backup_codes', response.data)

        # Verify settings saved
        mfa_settings = UserMFASettings.objects.get(user=self.user)
        self.assertTrue(mfa_settings.is_enabled)
        self.assertEqual(mfa_settings.totp_secret, secret)
```

## Deployment Checklist

- [ ] Install backend dependencies: `pip install -r requirements.txt`
- [ ] Run migrations: `python manage.py makemigrations` && `python manage.py migrate`
- [ ] Test MFA setup endpoint: `curl -X POST http://localhost:8000/api/auth/mfa/setup/`
- [ ] Frontend components created and tested
- [ ] MFA setup flow integrated into Settings page
- [ ] MFA verification integrated into login flow
- [ ] Backup codes generation tested
- [ ] Rate limiting applied to verification attempts
- [ ] CI/CD tests updated
- [ ] Production database includes new tables

## Security Considerations

1. **Never store TOTP secrets in plaintext** - Currently done correctly
2. **Use HTTPS only** - QR codes shouldn't be transmitted over HTTP
3. **Rate limit MFA verification** - Prevent brute force attacks
4. **Backup codes should be hashed** - Already implemented
5. **Clear sessions after MFA disable** - Force re-authentication
6. **Log all MFA events** - For audit trail (implement via middleware)

## FAQ

**Q: What if user loses authenticator app?**
A: Use backup codes or contact administrator to disable MFA temporarily.

**Q: Can users have multiple MFA methods?**
A: Current design supports one primary method. Could be extended to support multiple.

**Q: How long is TOTP token valid?**
A: Standard 30 seconds. Tokens within 60 seconds are also accepted (window=1).

**Q: Should I force MFA for all users?**
A: Recommended for admin/finance roles. Optional for regular users.

## Integration with Phase 1 Infrastructure

- Rate limiting: Use existing `@throttle_classes` decorator
- Logging: MFA events automatically logged via config/logging_config.py
- Testing: Follow existing pytest patterns in tests/conftest.py
- Security: Use existing decorators and middleware patterns

---

**Ready for implementation!** Begin Phase 3 by creating the models, utilities, and API endpoints.
