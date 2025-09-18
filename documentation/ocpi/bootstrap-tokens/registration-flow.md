# OCPI Registration Flow with Bootstrap Tokens

This document describes the complete OCPI peer registration process using bootstrap tokens, from initial business contact to fully operational OCPI integration.

## Overview

The OCPI registration follows a three-token handshake pattern:
- **CREDENTIALS_TOKEN_A** (Bootstrap Token) - Initial access
- **CREDENTIALS_TOKEN_B** - Partner's token for us to call them
- **CREDENTIALS_TOKEN_C** - Our token for partner to call us

## Complete Registration Flow

### Phase 1: Business Setup (Out-of-Band)

```mermaid
sequenceDiagram
    participant Admin as Admin User
    participant CPO as Your CPO Platform
    participant EMSP as Partner EMSP
    participant Email as Secure Channel

    Admin->>CPO: Generate bootstrap token
    CPO->>Admin: Return TOKEN_A + details
    Admin->>Email: Send integration package
    Email->>EMSP: Receive bootstrap credentials
```

#### 1.1 Generate Bootstrap Token

**Admin creates bootstrap token:**
```bash
curl -X POST http://localhost:3000/admin/ocpi/bootstrap-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Integration with ACME EMSP",
    "expiresInDays": 30
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clp123abc456def",
    "token": "bXktYm9vdHN0cmFwLXRva2Vu",
    "description": "Integration with ACME EMSP",
    "expiresAt": "2024-02-15T10:30:00.000Z"
  }
}
```

#### 1.2 Share Integration Package

**Send via secure email/document:**
```
OCPI Integration Credentials - Your CPO Platform

Bootstrap Token: bXktYm9vdHN0cmFwLXRva2Vu
Versions URL: https://your-cpo.com/ocpi/cpo/versions
Environment: Production
Valid Until: 2024-02-15
Technical Contact: tech@your-cpo.com

Next Steps:
1. Use bootstrap token to discover our OCPI versions
2. Send POST /credentials with your platform details
3. Begin operational integration testing
```

### Phase 2: OCPI Technical Handshake

```mermaid
sequenceDiagram
    participant EMSP as Partner EMSP
    participant Guard as OCPI Auth Guard
    participant Versions as Versions API
    participant Creds as Credentials API
    participant DB as Database
    participant CPO as Your CPO Platform

    Note over EMSP,CPO: Step 1: Version Discovery
    EMSP->>Guard: GET /versions + TOKEN_A
    Guard->>DB: Validate bootstrap token
    DB->>Guard: Token valid & active
    Guard->>Versions: Allow request
    Versions->>EMSP: Available versions

    Note over EMSP,CPO: Step 2: Version Details
    EMSP->>Guard: GET /2.2.1/ + TOKEN_A
    Guard->>DB: Validate bootstrap token
    Guard->>Versions: Allow request
    Versions->>EMSP: Endpoints for v2.2.1

    Note over EMSP,CPO: Step 3: Credentials Exchange
    EMSP->>Guard: POST /credentials + TOKEN_A + TOKEN_B
    Guard->>DB: Validate bootstrap token
    Guard->>Creds: Allow registration
    Creds->>CPO: Discover EMSP endpoints
    CPO->>EMSP: GET /versions (using TOKEN_B)
    EMSP->>CPO: Return versions
    CPO->>EMSP: GET /2.2.1/ (using TOKEN_B)
    EMSP->>CPO: Return endpoints
    Creds->>DB: Generate TOKEN_C & store peer
    DB->>Creds: Peer registered
    Creds->>DB: Mark TOKEN_A as used
    Creds->>EMSP: Return TOKEN_C + our details

    Note over EMSP,CPO: Registration Complete!
```

#### 2.1 Version Discovery

**Partner discovers available OCPI versions:**
```bash
curl -X GET https://your-cpo.com/ocpi/cpo/versions \
  -H "Authorization: Token $(echo 'bXktYm9vdHN0cmFwLXRva2Vu' | base64)"
```

**Response:**
```json
{
  "data": [
    {
      "version": "2.2.1",
      "url": "https://your-cpo.com/ocpi/cpo/2.2.1/"
    }
  ],
  "status_code": 1000,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 2.2 Endpoint Discovery

**Partner gets endpoints for chosen version:**
```bash
curl -X GET https://your-cpo.com/ocpi/cpo/2.2.1/ \
  -H "Authorization: Token $(echo 'bXktYm9vdHN0cmFwLXRva2Vu' | base64)"
```

**Response:**
```json
{
  "data": {
    "version": "2.2.1",
    "endpoints": [
      {
        "identifier": "credentials",
        "role": "RECEIVER",
        "url": "https://your-cpo.com/ocpi/cpo/2.2.1/credentials"
      },
      {
        "identifier": "locations",
        "role": "SENDER",
        "url": "https://your-cpo.com/ocpi/cpo/2.2.1/locations"
      }
    ]
  },
  "status_code": 1000,
  "timestamp": "2024-01-15T10:35:00Z"
}
```

#### 2.3 Credentials Registration

**Partner sends their credentials to register:**
```bash
curl -X POST https://your-cpo.com/ocpi/cpo/2.2.1/credentials \
  -H "Authorization: Token $(echo 'bXktYm9vdHN0cmFwLXRva2Vu' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "partner-token-b-for-us-to-use",
    "url": "https://acme-emsp.com/ocpi/emsp/versions",
    "roles": [
      {
        "role": "EMSP",
        "party_id": "ACM",
        "country_code": "NL",
        "business_details": {
          "name": "ACME E-Mobility Services",
          "website": "https://acme-emsp.com"
        }
      }
    ]
  }'
```

**Your platform's internal process:**
1. ✅ **Validate bootstrap token** - Check TOKEN_A is valid and unused
2. 🔍 **Discover partner endpoints** - Use TOKEN_B to call their `/versions`
3. 🔑 **Generate TOKEN_C** - Create new token for partner to call us
4. 💾 **Store peer details** - Save all tokens and endpoint mappings
5. ✅ **Mark TOKEN_A as used** - Prevent reuse of bootstrap token

**Response (Your credentials for partner):**
```json
{
  "data": {
    "token": "your-generated-token-c-for-partner",
    "url": "https://your-cpo.com/ocpi/cpo/versions",
    "roles": [
      {
        "role": "CPO",
        "party_id": "YCP",
        "country_code": "NL",
        "business_details": {
          "name": "Your CPO Platform",
          "website": "https://your-cpo.com"
        }
      }
    ]
  },
  "status_code": 1000,
  "timestamp": "2024-01-15T10:40:00Z"
}
```

### Phase 3: Operational Integration

After successful registration, both parties can now communicate using their assigned tokens:

#### 3.1 Partner Calls Your Platform

**Partner uses TOKEN_C to access your APIs:**
```bash
curl -X GET https://your-cpo.com/ocpi/cpo/2.2.1/locations \
  -H "Authorization: Token $(echo 'your-generated-token-c-for-partner' | base64)"
```

#### 3.2 You Call Partner Platform

**You use TOKEN_B to access partner APIs:**
```bash
curl -X GET https://acme-emsp.com/ocpi/emsp/2.2.1/sessions \
  -H "Authorization: Token $(echo 'partner-token-b-for-us-to-use' | base64)"
```

## Token Lifecycle

### Bootstrap Token States

```mermaid
stateDiagram-v2
    [*] --> Created: Admin creates token
    Created --> Active: Token ready for use
    Active --> Used: Successful registration
    Active --> Expired: Past expiration date
    Active --> Deactivated: Admin deactivates
    Used --> [*]: Audit complete
    Expired --> [*]: Cleanup job
    Deactivated --> [*]: Audit complete
```

**State Descriptions:**

| State | Description | Can Be Used? | Next States |
|-------|-------------|--------------|-------------|
| **Created** | Just generated | ✅ Yes | Active |
| **Active** | Ready for use | ✅ Yes | Used, Expired, Deactivated |
| **Used** | Registration completed | ❌ No | (Terminal) |
| **Expired** | Past expiry date | ❌ No | (Cleanup) |
| **Deactivated** | Manually disabled | ❌ No | (Terminal) |

### Token Usage Tracking

**Before registration:**
```json
{
  "id": "clp123abc456def",
  "token": "bXktYm9vdHN0cmFwLXRva2Vu",
  "isActive": true,
  "usedAt": null,
  "usedBy": null
}
```

**After successful registration:**
```json
{
  "id": "clp123abc456def",
  "token": "bXktYm9vdHN0cmFwLXRva2Vu",
  "isActive": true,
  "usedAt": "2024-01-15T10:40:00Z",
  "usedBy": "NL-ACM"
}
```

## Error Scenarios

### Invalid Bootstrap Token

```bash
curl -X GET https://your-cpo.com/ocpi/cpo/versions \
  -H "Authorization: Token aW52YWxpZC10b2tlbg=="
```

**Response (401 Unauthorized):**
```json
{
  "message": "Invalid or expired bootstrap token",
  "status_code": 2001,
  "timestamp": "2024-01-15T10:45:00Z"
}
```

### Expired Bootstrap Token

**Response (401 Unauthorized):**
```json
{
  "message": "Invalid or expired bootstrap token",
  "status_code": 2001,
  "timestamp": "2024-01-15T10:45:00Z"
}
```

### Used Bootstrap Token

**Response (401 Unauthorized):**
```json
{
  "message": "Invalid or expired bootstrap token",
  "status_code": 2001,
  "timestamp": "2024-01-15T10:45:00Z"
}
```

### Missing Authorization Header

```bash
curl -X GET https://your-cpo.com/ocpi/cpo/versions
```

**Response (401 Unauthorized):**
```json
{
  "message": "Missing Authorization header for bootstrap endpoint",
  "status_code": 2001,
  "timestamp": "2024-01-15T10:45:00Z"
}
```

## Best Practices

### For Administrators

1. **Descriptive Tokens**: Always include meaningful descriptions
   ```json
   {"description": "Production integration with ACME EMSP - Ticket #12345"}
   ```

2. **Appropriate Expiration**: Set reasonable expiry periods
   - Development: 7-14 days
   - Production: 30-60 days
   - Emergency: 1-3 days

3. **Secure Distribution**: Use encrypted email or secure document sharing

4. **Audit Trail**: Keep records of which tokens were sent to which partners

### For Partners

1. **Prompt Usage**: Use bootstrap tokens promptly after receiving them

2. **Secure Storage**: Store tokens securely until registration is complete

3. **Error Handling**: Implement proper error handling for token validation failures

4. **Communication**: Report any issues back to the providing party

### For Developers

1. **Token Validation**: Always validate bootstrap tokens before processing requests

2. **Single Use**: Ensure tokens cannot be reused after successful registration

3. **Audit Logging**: Log all bootstrap token usage attempts

4. **Error Messages**: Provide clear error messages without exposing sensitive information

## Monitoring and Maintenance

### Regular Tasks

1. **Token Cleanup**: Run cleanup job to remove expired tokens
   ```bash
   curl -X POST http://localhost:3000/admin/ocpi/bootstrap-tokens/cleanup-expired
   ```

2. **Usage Review**: Monitor token usage patterns
   ```bash
   curl -X GET http://localhost:3000/admin/ocpi/bootstrap-tokens?includeInactive=true
   ```

3. **Security Audit**: Regular review of token generation and usage

### Metrics to Track

- Number of active bootstrap tokens
- Token usage success rate
- Time from token generation to usage
- Expired tokens cleanup frequency
- Failed authentication attempts

## See Also

- [Admin API Reference](./admin-api.md) - Complete API documentation
- [Security Guide](./security.md) - Security best practices and troubleshooting
- [OCPI Specification](../../.claude/ocpi-2.2.1/) - Official OCPI documentation