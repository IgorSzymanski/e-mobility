# Bootstrap Tokens Security Guide

Security best practices, troubleshooting, and operational guidelines for the OCPI Bootstrap Token system.

## Security Model

### Threat Model

The bootstrap token system protects against:

✅ **Unauthorized OCPI endpoint access**
- Public endpoints are protected by bootstrap token validation
- Prevents random internet users from discovering OCPI capabilities

✅ **Token replay attacks**
- Bootstrap tokens are single-use only
- Once used for registration, tokens become invalid

✅ **Expired token usage**
- Automatic expiration prevents long-lived attack vectors
- Cleanup processes remove old tokens

✅ **Brute force token guessing**
- Cryptographically secure token generation (256-bit)
- Base64URL encoding without padding

❌ **Not protected against:**
- Man-in-the-middle attacks (require HTTPS)
- Compromised admin systems
- Social engineering of legitimate tokens

### Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        A[HTTPS/TLS] --> B[Bootstrap Token Validation]
        B --> C[Single-Use Enforcement]
        C --> D[Expiration Validation]
        D --> E[Audit Logging]
    end

    subgraph "Attack Vectors"
        F[Public Internet] -.->|Blocked| A
        G[Invalid Tokens] -.->|Rejected| B
        H[Replay Attacks] -.->|Prevented| C
        I[Old Tokens] -.->|Expired| D
    end
```

## Production Security Checklist

### 🔒 Essential Security Measures

- [ ] **HTTPS Only**: Never transmit bootstrap tokens over HTTP
- [ ] **Admin Authentication**: Implement proper admin API authentication
- [ ] **Token Expiration**: Set appropriate expiry periods for all tokens
- [ ] **Secure Distribution**: Use encrypted channels for token sharing
- [ ] **Audit Logging**: Log all token operations and access attempts
- [ ] **Regular Cleanup**: Implement automated cleanup of expired tokens

### 🔧 Configuration Security

#### Environment Variables

```bash
# Production settings
NODE_ENV=production
OCPI_BASE_URL=https://your-domain.com

# Secure token generation
TOKEN_HMAC_SECRET=your-very-secure-hmac-secret-here

# Database security
DATABASE_URL=postgresql://user:pass@localhost:5432/db?sslmode=require
```

#### HTTPS Configuration

```typescript
// main.ts - Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`)
    } else {
      next()
    }
  })
}
```

### 🛡️ Admin API Security

#### Authentication (Recommended Implementation)

```typescript
// admin-auth.guard.ts
@Injectable()
export class AdminAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const adminToken = request.headers['x-admin-token']

    if (!adminToken || adminToken !== process.env.ADMIN_API_TOKEN) {
      throw new UnauthorizedException('Invalid admin credentials')
    }

    return true
  }
}

// Apply to admin controller
@UseGuards(AdminAuthGuard)
@Controller('/admin/ocpi/bootstrap-tokens')
export class BootstrapTokensController {
  // ...
}
```

#### Rate Limiting

```typescript
// Install: npm install @nestjs/throttler
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60, // 1 minute
      limit: 10, // 10 requests per minute
    }),
  ],
})
export class AdminModule {}
```

## Token Security Best Practices

### Token Generation

```typescript
// Current implementation uses secure random generation
class TokenGenerator {
  generate(): string {
    const buf = randomBytes(32) // 256-bit entropy
    return this.toBase64Url(buf) // URL-safe encoding
  }
}
```

**Security Features:**
- 256-bit cryptographically secure random number generation
- Base64URL encoding (URL-safe, no padding)
- HMAC-SHA256 hashing for storage (optional)

### Token Distribution

#### ✅ Secure Methods

1. **Encrypted Email**
   ```
   Subject: OCPI Integration Credentials [CONFIDENTIAL]

   [PGP/S-MIME encrypted content]
   Bootstrap Token: [token]
   ```

2. **Secure Document Sharing**
   - Google Drive with restricted access
   - SharePoint with password protection
   - Encrypted file transfer services

3. **Out-of-Band Verification**
   - Phone call to confirm token receipt
   - Two-person email verification

#### ❌ Insecure Methods

- Plain text email
- Slack/Teams messages
- SMS messages
- Unencrypted file shares
- Version control systems

### Token Storage

#### Partner Side

```typescript
// Store securely until registration
const bootstrapToken = process.env.BOOTSTRAP_TOKEN
if (!bootstrapToken) {
  throw new Error('Bootstrap token not configured')
}

// Use immediately for registration
const registrationResult = await registerWithOCPI(bootstrapToken)

// Clear from memory after use
delete process.env.BOOTSTRAP_TOKEN
```

#### Your Platform

```typescript
// Hash tokens in database (optional)
class TokenGenerator {
  hash(token: string): string {
    if (this.hmacSecret) {
      return createHmac('sha256', this.hmacSecret)
        .update(token, 'utf8')
        .digest('hex')
    }
    return createHash('sha256').update(token, 'utf8').digest('hex')
  }
}
```

## Troubleshooting Guide

### Common Issues

#### 1. "Invalid or expired bootstrap token"

**Possible Causes:**
- Token has already been used
- Token has expired
- Token was deactivated
- Incorrect Base64 encoding

**Debugging Steps:**
```bash
# Check token status
curl -X GET http://localhost:3000/admin/ocpi/bootstrap-tokens

# Look for your token in the list
# Check usedAt, expiresAt, isActive fields
```

**Solutions:**
- Generate a new bootstrap token
- Check expiration date
- Verify token wasn't accidentally deactivated

#### 2. "Missing Authorization header"

**Possible Causes:**
- Authorization header not included
- Incorrect header format
- Case sensitivity issues

**Correct Format:**
```bash
# Correct
curl -H "Authorization: Token $(echo 'your-token' | base64)"

# Incorrect - missing 'Token ' prefix
curl -H "Authorization: $(echo 'your-token' | base64)"

# Incorrect - case sensitivity
curl -H "authorization: Token $(echo 'your-token' | base64)"
```

#### 3. Base64 Encoding Issues

**Common Problems:**
```bash
# Wrong - adds newlines
TOKEN=$(echo 'your-token' | base64)

# Correct - no newlines
TOKEN=$(echo -n 'your-token' | base64)

# Alternative - URL encoding
TOKEN=$(printf '%s' 'your-token' | base64)
```

#### 4. Network/TLS Issues

**Certificate Problems:**
```bash
# Skip certificate verification (development only!)
curl -k -X GET https://your-api.com/ocpi/cpo/versions

# Specify CA bundle
curl --cacert /path/to/ca-bundle.pem https://your-api.com/ocpi/cpo/versions
```

### Debugging Tools

#### Enable Debug Logging

```typescript
// logger.service.ts
export class Logger {
  debug(message: string, context?: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${context}: ${message}`)
    }
  }
}

// ocpi-auth.guard.ts
async validateBootstrapToken(token: string): Promise<boolean> {
  this.logger.debug(`Validating bootstrap token: ${token.substring(0, 8)}...`)

  const isValid = await this.bootstrapTokens.validateBootstrapToken(token)
  this.logger.debug(`Bootstrap token validation result: ${isValid}`)

  return isValid
}
```

#### Token Validation Test Script

```bash
#!/bin/bash
# test-bootstrap-token.sh

API_BASE="https://your-api.com/ocpi/cpo"
TOKEN="your-bootstrap-token-here"
ENCODED_TOKEN=$(echo -n "$TOKEN" | base64)

echo "Testing bootstrap token validation..."
echo "Token (first 8 chars): ${TOKEN:0:8}..."
echo "Encoded: ${ENCODED_TOKEN:0:12}..."

# Test versions endpoint
echo -e "\n1. Testing /versions endpoint:"
curl -v -X GET "$API_BASE/versions" \
  -H "Authorization: Token $ENCODED_TOKEN" \
  2>&1 | grep -E "(HTTP|authorization|error)"

# Test credentials endpoint (if versions worked)
echo -e "\n2. Testing /2.2.1/ endpoint:"
curl -v -X GET "$API_BASE/2.2.1/" \
  -H "Authorization: Token $ENCODED_TOKEN" \
  2>&1 | grep -E "(HTTP|authorization|error)"
```

## Monitoring and Alerting

### Security Metrics

Track these metrics for security monitoring:

```typescript
// metrics.service.ts
export class SecurityMetrics {
  // Bootstrap token metrics
  @Counter('bootstrap_tokens_created_total')
  bootstrapTokensCreated: number = 0

  @Counter('bootstrap_tokens_used_total')
  bootstrapTokensUsed: number = 0

  @Counter('bootstrap_token_validation_failures_total')
  bootstrapTokenValidationFailures: number = 0

  @Histogram('bootstrap_token_lifetime_hours')
  bootstrapTokenLifetime: number[] = []

  // Authentication metrics
  @Counter('auth_failures_total')
  authFailures: number = 0

  @Counter('auth_success_total')
  authSuccess: number = 0
}
```

### Alert Conditions

Set up alerts for:

1. **High Authentication Failures**
   - More than 10 failed bootstrap token validations per hour
   - Could indicate brute force attempts

2. **Unused Tokens**
   - Bootstrap tokens created but not used within 48 hours
   - May indicate distribution/communication issues

3. **Token Generation Spikes**
   - Unusual number of tokens created
   - Could indicate compromised admin access

4. **Expired Token Usage Attempts**
   - Attempts to use expired tokens
   - May indicate partner confusion or malicious activity

### Log Analysis

```bash
# Search for bootstrap token events
grep "bootstrap" /var/log/app.log | tail -20

# Count failed validations by hour
grep "bootstrap.*invalid" /var/log/app.log | \
  awk '{print $1" "$2}' | sort | uniq -c

# Find successful registrations
grep "bootstrap.*used" /var/log/app.log | \
  grep -o "usedBy.*" | sort | uniq
```

## Incident Response

### Compromised Bootstrap Token

If a bootstrap token is suspected to be compromised:

1. **Immediate Response**
   ```bash
   # Deactivate the token immediately
   curl -X DELETE http://localhost:3000/admin/ocpi/bootstrap-tokens/{token-id}
   ```

2. **Investigation**
   - Check access logs for unauthorized usage
   - Verify if token was actually used
   - Contact the intended recipient

3. **Recovery**
   - Generate new bootstrap token
   - Securely distribute new token
   - Update documentation/communication

### Compromised Admin Access

If admin API access is compromised:

1. **Immediate Response**
   - Change admin API credentials
   - Revoke all active bootstrap tokens
   - Review recent admin API activity

2. **Investigation**
   - Audit all recently created tokens
   - Check for unauthorized OCPI registrations
   - Review system access logs

3. **Recovery**
   - Re-establish legitimate integrations
   - Implement additional admin security measures
   - Update incident response procedures

## Compliance and Auditing

### OCPI Compliance

This implementation meets OCPI 2.2.1 security requirements:

- ✅ **Section 4.1.3**: Authorization header format
- ✅ **Section 7.1.1**: Secure credentials exchange
- ✅ **Section 2.3**: Status code compliance
- ✅ **Security**: Token-based authentication

### Audit Trail

The system maintains a complete audit trail:

```sql
-- Query bootstrap token usage
SELECT
  id,
  description,
  created_at,
  used_at,
  used_by,
  CASE
    WHEN used_at IS NOT NULL THEN 'USED'
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN is_active = false THEN 'DEACTIVATED'
    ELSE 'ACTIVE'
  END as status
FROM ocpi.bootstrap_tokens
ORDER BY created_at DESC;

-- Token usage analytics
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as tokens_created,
  COUNT(used_at) as tokens_used,
  ROUND(COUNT(used_at) * 100.0 / COUNT(*), 2) as usage_rate
FROM ocpi.bootstrap_tokens
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

### Data Retention

Configure appropriate data retention policies:

```typescript
// cleanup.service.ts
@Cron('0 2 * * *') // Daily at 2 AM
async cleanupOldTokens() {
  // Remove expired tokens older than 90 days
  await this.bootstrapTokensRepository.deleteExpired(90)

  // Archive used tokens older than 1 year
  await this.bootstrapTokensRepository.archiveOldUsedTokens(365)
}
```

## Security Updates

### Keep Dependencies Updated

```bash
# Check for security vulnerabilities
npm audit

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Security Patches

Monitor these components for security updates:
- NestJS framework
- Prisma ORM
- PostgreSQL database
- Node.js runtime
- TLS/SSL certificates

## See Also

- [Admin API Reference](./admin-api.md) - API security considerations
- [Registration Flow](./registration-flow.md) - Security checkpoints in the flow
- [OWASP Guidelines](https://owasp.org/) - General web application security