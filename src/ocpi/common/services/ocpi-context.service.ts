import { Injectable, Logger } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'
import type { OcpiParty } from './ocpi-token-validation.service'

export interface OcpiRequestContext {
  readonly party: OcpiParty
  readonly credentialsToken: string
  readonly requestId?: string
}

/**
 * Service that provides OCPI request context using AsyncLocalStorage
 * This enables automatic tenant isolation for database operations
 */
@Injectable()
export class OcpiContextService {
  private readonly logger = new Logger(OcpiContextService.name)
  private readonly asyncStorage = new AsyncLocalStorage<OcpiRequestContext>()

  /**
   * Run a function with OCPI context
   */
  run<T>(context: OcpiRequestContext, fn: () => T): T {
    return this.asyncStorage.run(context, fn)
  }

  /**
   * Get the current OCPI context
   * Throws if no context is available
   */
  getContext(): OcpiRequestContext {
    const context = this.asyncStorage.getStore()
    if (!context) {
      throw new Error(
        'No OCPI context available. Ensure request is properly authenticated.',
      )
    }
    return context
  }

  /**
   * Get the authenticated party information
   */
  getParty(): OcpiParty {
    return this.getContext().party
  }

  /**
   * Get the credentials token for the current request
   */
  getCredentialsToken(): string {
    return this.getContext().credentialsToken
  }

  /**
   * Check if the current party can access resources for the given country code and party ID
   */
  canAccessPartyResources(
    targetCountryCode: string,
    targetPartyId: string,
  ): boolean {
    const party = this.getParty()

    const hasAccess =
      party.countryCode === targetCountryCode && party.partyId === targetPartyId

    if (!hasAccess) {
      this.logger.warn(
        `Access denied: Party ${party.countryCode}*${party.partyId} tried to access resources for ${targetCountryCode}*${targetPartyId}`,
      )
    }

    return hasAccess
  }

  /**
   * Validate party access and throw if unauthorized
   */
  validatePartyAccess(targetCountryCode: string, targetPartyId: string): void {
    if (!this.canAccessPartyResources(targetCountryCode, targetPartyId)) {
      const party = this.getParty()
      throw new Error(
        `Unauthorized: Party ${party.countryCode}*${party.partyId} cannot access resources for ${targetCountryCode}*${targetPartyId}`,
      )
    }
  }

  /**
   * Get party filter for database queries
   * This ensures all queries are automatically scoped to the authenticated party
   */
  getPartyFilter(): { countryCode: string; partyId: string } {
    const party = this.getParty()
    return {
      countryCode: party.countryCode,
      partyId: party.partyId,
    }
  }
}
