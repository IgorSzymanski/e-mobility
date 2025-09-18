# OCPI Bootstrap Tokens

This documentation covers the OCPI Bootstrap Token system implementation for secure peer registration in compliance with OCPI 2.2.1 specification.

## Overview

The Bootstrap Token system provides the missing **CREDENTIALS_TOKEN_A** functionality required for secure OCPI peer registration. This system ensures that only authorized parties can initiate the OCPI handshake process.

### What Are Bootstrap Tokens?

Bootstrap tokens (CREDENTIALS_TOKEN_A) are special one-time tokens that:
- Enable secure out-of-band OCPI peer registration
- Protect public OCPI endpoints from unauthorized access
- Track which partners have completed registration
- Support expiration and usage policies

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin API     │    │  Bootstrap       │    │  OCPI Guard     │
│   /admin/ocpi/  │───▶│  Tokens Service  │───▶│  Validation     │
│   bootstrap-    │    │                  │    │                 │
│   tokens        │    └──────────────────┘    └─────────────────┘
└─────────────────┘              │                       │
                                 ▼                       ▼
                    ┌──────────────────┐    ┌─────────────────┐
                    │   Database       │    │  OCPI Endpoints │
                    │   Bootstrap      │    │  /versions      │
                    │   Tokens Table   │    │  /credentials   │
                    └──────────────────┘    └─────────────────┘
```

## Key Components

### 1. Database Model (`OcpiBootstrapToken`)
- **Primary Key**: `id` (CUID)
- **Token**: Unique, secure token string
- **Description**: Human-readable purpose
- **Expiration**: Optional expiry date
- **Usage Tracking**: `usedAt`, `usedBy` fields
- **Status**: `isActive` flag for deactivation

### 2. Admin API (`/admin/ocpi/bootstrap-tokens`)
- Create new bootstrap tokens
- List and manage existing tokens
- Deactivate tokens
- Cleanup expired tokens

### 3. Security Integration (`OcpiAuthGuard`)
- Validates bootstrap tokens for `@SkipOcpiAuth` endpoints
- Enforces single-use policy
- Tracks usage upon successful registration

## Quick Start

### 1. Generate a Bootstrap Token

```bash
curl -X POST http://localhost:3000/admin/ocpi/bootstrap-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Integration with ACME CPO",
    "expiresInDays": 30
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "clp123xyz789",
    "token": "eyJhbGciOiJ...",
    "description": "Integration with ACME CPO",
    "expiresAt": "2024-02-15T10:30:00.000Z",
    "usedAt": null,
    "usedBy": null,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Share Bootstrap Information

Send via secure channel (email/document):
```
OCPI Integration Credentials:
- Bootstrap Token: eyJhbGciOiJ...
- Versions URL: https://your-api.com/ocpi/cpo/versions
- Environment: Production
- Expires: 2024-02-15
```

### 3. Partner Uses Token

Partner makes initial OCPI requests:
```bash
# Get versions
curl -X GET https://your-api.com/ocpi/cpo/versions \
  -H "Authorization: Token $(echo 'eyJhbGciOiJ...' | base64)"

# Register credentials
curl -X POST https://your-api.com/ocpi/cpo/2.2.1/credentials \
  -H "Authorization: Token $(echo 'eyJhbGciOiJ...' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "partner-token-b",
    "url": "https://partner.com/ocpi/versions",
    "roles": [...]
  }'
```

After successful registration, the bootstrap token is automatically marked as used and can no longer be used.

## OCPI Compliance

This implementation follows OCPI 2.2.1 specification:

- ✅ **Section 7.1.1**: Bootstrap token acts as CREDENTIALS_TOKEN_A
- ✅ **Section 4.1.3**: Proper Base64 encoding in Authorization headers
- ✅ **Security**: Single-use tokens with expiration
- ✅ **Tracking**: Full audit trail of token usage

## Related Documentation

- [Admin API Reference](./admin-api.md) - Complete API documentation
- [Registration Flow](./registration-flow.md) - Step-by-step OCPI handshake
- [Security Guide](./security.md) - Best practices and troubleshooting

## Database Schema

```sql
CREATE TABLE ocpi.bootstrap_tokens (
  id VARCHAR PRIMARY KEY,
  token VARCHAR(128) UNIQUE NOT NULL,
  description VARCHAR(512),
  expires_at TIMESTAMP,
  used_at TIMESTAMP,
  used_by VARCHAR(128),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bootstrap_tokens_token ON ocpi.bootstrap_tokens(token);
CREATE INDEX idx_bootstrap_tokens_active ON ocpi.bootstrap_tokens(is_active);
CREATE INDEX idx_bootstrap_tokens_expires ON ocpi.bootstrap_tokens(expires_at);
```