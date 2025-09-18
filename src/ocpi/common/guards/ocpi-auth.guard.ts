import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import {
  OcpiTokenValidationService,
  type OcpiParty,
} from '../services/ocpi-token-validation.service'
import { BootstrapTokensService } from '@/admin/bootstrap-tokens/bootstrap-tokens.service'

export const SKIP_OCPI_AUTH_KEY = 'skipOcpiAuth'

interface RequestWithOcpiAuth extends Request {
  ocpiParty?: OcpiParty
  credentialsToken?: string
}

/**
 * Guard that validates OCPI Authorization header for all OCPI endpoints
 * except those marked with @SkipOcpiAuth decorator
 */
@Injectable()
export class OcpiAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenValidation: OcpiTokenValidationService,
    private readonly bootstrapTokens: BootstrapTokensService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipAuth = this.reflector.getAllAndOverride<boolean>(
      SKIP_OCPI_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    )

    const request = context.switchToHttp().getRequest<RequestWithOcpiAuth>()

    if (skipAuth) {
      // For endpoints marked with @SkipOcpiAuth, check if it's a credentials endpoint
      // Only credentials endpoints during registration need bootstrap token validation
      // Other endpoints (like /versions) should be publicly accessible
      if (request.url?.includes('/credentials')) {
        return this.validateBootstrapToken(request)
      }
      // Public endpoints like /versions don't need any authentication
      return true
    }
    const authHeader = request.headers.authorization

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header')
    }

    if (!authHeader.startsWith('Token ')) {
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected: Token <credentials-token>',
      )
    }

    const encodedToken = authHeader.substring(6) // Remove 'Token ' prefix
    let credentialsToken: string

    try {
      // OCPI 2.2.1+ requires Base64 encoding of credentials token
      // First check if it looks like Base64 (contains only valid Base64 characters)
      if (/^[A-Za-z0-9+/]*={0,2}$/.test(encodedToken)) {
        const decoded = Buffer.from(encodedToken, 'base64').toString('utf-8')
        // Verify the decoded content looks reasonable (printable ASCII)
        if (/^[\x20-\x7E]+$/.test(decoded)) {
          credentialsToken = decoded
        } else {
          // Not valid decoded content, treat as non-Base64
          credentialsToken = encodedToken
        }
      } else {
        // Doesn't look like Base64, treat as plain token
        credentialsToken = encodedToken
      }
    } catch {
      // Fallback for OCPI 2.1.1/2.2 implementations that don't Base64 encode
      credentialsToken = encodedToken
    }

    if (!credentialsToken) {
      throw new UnauthorizedException('Invalid credentials token')
    }

    // Validate the token and get party information
    const party =
      await this.tokenValidation.validateCredentialsToken(credentialsToken)

    if (!party) {
      throw new UnauthorizedException('Invalid or unknown credentials token')
    }

    // Add party information to request for use in controllers
    request.ocpiParty = party
    request.credentialsToken = credentialsToken

    return true
  }

  private async validateBootstrapToken(
    request: RequestWithOcpiAuth,
  ): Promise<boolean> {
    const authHeader = request.headers.authorization

    if (!authHeader) {
      throw new UnauthorizedException(
        'Missing Authorization header for bootstrap endpoint',
      )
    }

    if (!authHeader.startsWith('Token ')) {
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected: Token <bootstrap-token>',
      )
    }

    const encodedToken = authHeader.substring(6) // Remove 'Token ' prefix
    let bootstrapToken: string

    try {
      // OCPI 2.2.1+ requires Base64 encoding of tokens
      if (/^[A-Za-z0-9+/]*={0,2}$/.test(encodedToken)) {
        const decoded = Buffer.from(encodedToken, 'base64').toString('utf-8')
        if (/^[\x20-\x7E]+$/.test(decoded)) {
          bootstrapToken = decoded
        } else {
          bootstrapToken = encodedToken
        }
      } else {
        bootstrapToken = encodedToken
      }
    } catch {
      bootstrapToken = encodedToken
    }

    if (!bootstrapToken) {
      throw new UnauthorizedException('Invalid bootstrap token')
    }

    // Validate bootstrap token
    const isValid =
      await this.bootstrapTokens.validateBootstrapToken(bootstrapToken)

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired bootstrap token')
    }

    // Store the bootstrap token in request for potential use
    request.credentialsToken = bootstrapToken

    return true
  }
}
