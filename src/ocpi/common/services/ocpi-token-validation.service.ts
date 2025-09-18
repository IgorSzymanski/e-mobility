import { Injectable, Logger } from '@nestjs/common'
import { PeersRepository } from '@/infrastructure/persistence/peers.repository'

export interface OcpiParty {
  readonly countryCode: string
  readonly partyId: string
  readonly role: string
  readonly businessDetails: {
    readonly name: string
    readonly website?: string
  }
}

interface PeerCredentialsResult {
  countryCode: string
  partyId: string
  role: string
  businessDetailsName: string
  businessDetailsWebsite: string | null
}

/**
 * Service responsible for validating OCPI credentials tokens
 * and retrieving associated party information
 */
@Injectable()
export class OcpiTokenValidationService {
  private readonly logger = new Logger(OcpiTokenValidationService.name)

  constructor(private readonly peersRepository: PeersRepository) {}

  /**
   * Validates a credentials token and returns the associated party information
   * @param credentialsToken The token to validate
   * @returns Party information if valid, null if invalid
   */
  async validateCredentialsToken(
    credentialsToken: string,
  ): Promise<OcpiParty | null> {
    try {
      // Look up the peer by their credentials token
      const peer =
        await this.peersRepository.findByCredentialsToken(credentialsToken)

      if (!peer) {
        return null
      }

      // Convert peer data to OcpiParty format
      const peerResult = peer as PeerCredentialsResult
      return {
        countryCode: peerResult.countryCode,
        partyId: peerResult.partyId,
        role: peerResult.role,
        businessDetails: {
          name: peerResult.businessDetailsName,
          website: peerResult.businessDetailsWebsite || undefined,
        },
      } satisfies OcpiParty
    } catch (error) {
      // Log error but don't expose internal details
      this.logger.error('Error validating credentials token', error)
      return null
    }
  }

  /**
   * Checks if a party has access to a specific endpoint based on their role
   * @param party The authenticated party
   * @param endpoint The endpoint being accessed
   * @returns true if access is allowed
   */
  hasEndpointAccess(party: OcpiParty, endpoint: string): boolean {
    // Basic role-based access control
    // This can be extended based on specific OCPI module requirements

    // All authenticated parties can access versions and credentials
    if (['versions', 'credentials'].includes(endpoint)) {
      return true
    }

    // Role-specific access can be implemented here
    // For now, allow access to all endpoints for authenticated parties
    return true
  }
}
