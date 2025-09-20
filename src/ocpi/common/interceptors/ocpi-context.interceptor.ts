import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { Request } from 'express'
import { OcpiContextService } from '../services/ocpi-context.service'
import type { OcpiParty } from '../services/ocpi-token-validation.service'
import { randomUUID } from 'crypto'

interface RequestWithOcpiAuth extends Request {
  ocpiParty?: OcpiParty
  credentialsToken?: string
}

/**
 * Interceptor that sets up OCPI context using AsyncLocalStorage
 * This enables automatic tenant isolation throughout the request lifecycle
 */
@Injectable()
export class OcpiContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(OcpiContextInterceptor.name)

  constructor(private readonly contextService: OcpiContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithOcpiAuth>()

    // Skip context setup for unauthenticated requests (like public endpoints)
    if (!request.ocpiParty || !request.credentialsToken) {
      return next.handle()
    }

    // Set up OCPI context for the request
    const requestContext = {
      party: request.ocpiParty,
      credentialsToken: request.credentialsToken,
      requestId: randomUUID(),
    }

    this.logger.debug(
      `Setting up OCPI context for party ${requestContext.party.countryCode}*${requestContext.party.partyId} (${requestContext.party.role})`,
    )

    // Run the request within the context
    return new Observable((observer) => {
      this.contextService.run(requestContext, () => {
        const subscription = next.handle().subscribe({
          next: (value) => observer.next(value),
          error: (error) => observer.error(error),
          complete: () => observer.complete(),
        })

        return () => subscription.unsubscribe()
      })
    })
  }
}
