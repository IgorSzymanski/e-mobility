# Bootstrap Tokens Admin API

Complete API reference for managing OCPI Bootstrap Tokens.

## Base URL

```
/admin/ocpi/bootstrap-tokens
```

## Authentication

> **Note**: Currently, the admin API does not have authentication. In production, you should implement proper admin authentication/authorization.

## Endpoints

### Create Bootstrap Token

Create a new bootstrap token for OCPI peer registration.

```http
POST /admin/ocpi/bootstrap-tokens
Content-Type: application/json
```

**Request Body:**
```json
{
  "description": "string (optional)",
  "expiresInDays": "number (optional, 1-365)"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "clp123abc456def",
    "token": "bXktYm9vdHN0cmFwLXRva2Vu",
    "description": "Integration with ACME CPO",
    "expiresAt": "2024-02-15T10:30:00.000Z",
    "usedAt": null,
    "usedBy": null,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Bootstrap token created successfully"
}
```

**Validation Errors (400):**
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "expiresInDays",
      "message": "Number must be greater than or equal to 1"
    }
  ]
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/admin/ocpi/bootstrap-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Integration with ACME CPO",
    "expiresInDays": 30
  }'
```

---

### List Bootstrap Tokens

Retrieve all bootstrap tokens with optional filtering.

```http
GET /admin/ocpi/bootstrap-tokens?includeInactive=false
```

**Query Parameters:**
- `includeInactive` (boolean, optional): Include deactivated tokens. Default: `false`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clp123abc456def",
      "token": "bXktYm9vdHN0cmFwLXRva2Vu",
      "description": "Integration with ACME CPO",
      "expiresAt": "2024-02-15T10:30:00.000Z",
      "usedAt": null,
      "usedBy": null,
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": "clp789xyz123ghi",
      "token": "YW5vdGhlci10b2tlbg",
      "description": "Demo integration",
      "expiresAt": null,
      "usedAt": "2024-01-10T14:22:00.000Z",
      "usedBy": "NL-ACM",
      "isActive": true,
      "createdAt": "2024-01-05T09:15:00.000Z"
    }
  ]
}
```

**Example:**
```bash
# Get active tokens only
curl -X GET http://localhost:3000/admin/ocpi/bootstrap-tokens

# Get all tokens including inactive
curl -X GET http://localhost:3000/admin/ocpi/bootstrap-tokens?includeInactive=true
```

---

### Get Bootstrap Token

Retrieve a specific bootstrap token by ID.

```http
GET /admin/ocpi/bootstrap-tokens/{id}
```

**Path Parameters:**
- `id` (string, required): Bootstrap token ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "clp123abc456def",
    "token": "bXktYm9vdHN0cmFwLXRva2Vu",
    "description": "Integration with ACME CPO",
    "expiresAt": "2024-02-15T10:30:00.000Z",
    "usedAt": null,
    "usedBy": null,
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": true,
  "data": null,
  "message": "Bootstrap token not found"
}
```

**Example:**
```bash
curl -X GET http://localhost:3000/admin/ocpi/bootstrap-tokens/clp123abc456def
```

---

### Deactivate Bootstrap Token

Deactivate a bootstrap token, preventing further use.

```http
DELETE /admin/ocpi/bootstrap-tokens/{id}
```

**Path Parameters:**
- `id` (string, required): Bootstrap token ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": null,
  "message": "Bootstrap token deactivated successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3000/admin/ocpi/bootstrap-tokens/clp123abc456def
```

---

### Cleanup Expired Tokens

Remove all expired bootstrap tokens from the database.

```http
POST /admin/ocpi/bootstrap-tokens/cleanup-expired
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deletedCount": 5
  },
  "message": "Cleaned up 5 expired tokens"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/admin/ocpi/bootstrap-tokens/cleanup-expired
```

## Token States

### Active Token
```json
{
  "isActive": true,
  "usedAt": null,
  "expiresAt": "2024-02-15T10:30:00.000Z"
}
```
- Can be used for OCPI registration
- Has not expired
- Has not been used yet

### Used Token
```json
{
  "isActive": true,
  "usedAt": "2024-01-20T15:45:00.000Z",
  "usedBy": "NL-ACM"
}
```
- Successfully used for registration
- Cannot be reused
- Tracks which party used it

### Expired Token
```json
{
  "isActive": true,
  "expiresAt": "2024-01-10T10:30:00.000Z",
  "usedAt": null
}
```
- Past expiration date
- Cannot be used
- Will be removed by cleanup

### Deactivated Token
```json
{
  "isActive": false,
  "usedAt": null
}
```
- Manually deactivated
- Cannot be used
- Remains in database for audit

## Response Format

All responses follow this consistent format:

```typescript
interface AdminResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}
```

## Error Handling

### Validation Errors (400)
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "fieldName",
      "message": "Error description"
    }
  ]
}
```

### Server Errors (500)
```json
{
  "message": "Internal server error",
  "error": "Error details"
}
```

## Integration Examples

### Node.js/TypeScript
```typescript
import axios from 'axios'

const adminApi = axios.create({
  baseURL: 'http://localhost:3000/admin/ocpi/bootstrap-tokens'
})

// Create token
const { data } = await adminApi.post('/', {
  description: 'Integration with ACME CPO',
  expiresInDays: 30
})

console.log('Bootstrap token:', data.data.token)

// List tokens
const tokens = await adminApi.get('/')
console.log('Active tokens:', tokens.data.data.length)
```

### cURL Script
```bash
#!/bin/bash
API_BASE="http://localhost:3000/admin/ocpi/bootstrap-tokens"

# Create token
TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE" \
  -H "Content-Type: application/json" \
  -d '{"description":"Script generated","expiresInDays":7}')

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.data.token')
echo "Generated token: $TOKEN"

# List tokens
curl -s -X GET "$API_BASE" | jq '.data[] | {id, description, isActive}'
```

## Security Considerations

1. **Admin Access**: Implement proper authentication for admin endpoints
2. **Token Exposure**: Bootstrap tokens should only be shared via secure channels
3. **Audit Logging**: Consider logging all admin API operations
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Token Rotation**: Regularly cleanup expired/used tokens

## See Also

- [Registration Flow](./registration-flow.md) - How tokens are used in OCPI handshake
- [Security Guide](./security.md) - Security best practices