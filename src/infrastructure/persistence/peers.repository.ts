/* eslint-disable @typescript-eslint/require-await */
// infrastructure/persistence/peers.repository.ts
import { Injectable } from '@nestjs/common'
import {
  PrismaClient,
  OcpiPeerStatus,
  OcpiModuleIdentifier,
  OcpiRole,
} from '@prisma/client'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import { TokenGenerator } from '@/infrastructure/security/token-generator'
import type { CredentialsDto } from '@/ocpi/v2_2_1/credentials/dto/credentials.dto'

@Injectable()
export class PeersRepository {
  readonly #db: PrismaClient
  readonly #tokenGen: TokenGenerator
  constructor(
    db: PrismaClient,
    private readonly ocpiConfig: OcpiConfigService,
    tokenGen: TokenGenerator,
  ) {
    this.#db = db
    this.#tokenGen = tokenGen
  }

  async upsertFromIncomingCredentials(dto: CredentialsDto) {
    // Pick canonical identity from roles (first role is fine; you may require exactly one EMSP/CPO tuple)
    const r = dto.roles[0]

    const peer = await this.#db.ocpiPeer.upsert({
      where: {
        uq_party: {
          countryCode: r.country_code,
          partyId: r.party_id,
        },
      },
      update: {
        baseVersionsUrl: dto.url,
        rolesJson: dto.roles,
        ourTokenForPeer: dto.token,
        status: OcpiPeerStatus.PENDING,
        lastUpdated: new Date(),
      },
      create: {
        countryCode: r.country_code,
        partyId: r.party_id,
        baseVersionsUrl: dto.url,
        rolesJson: dto.roles,
        chosenVersion: '2.2.1', // temporary until negotiate
        ourTokenForPeer: dto.token, // B (we will use this to call them)
        peerTokenForUs: '', // peer_token_for_us will be set later
        status: OcpiPeerStatus.PENDING,
      },
    })

    return peer
  }

  async setPeerTokenForUs(
    peerId: string,
    tokenC: string,
    version: string,
    endpoints: ReadonlyArray<{ identifier: string; role: string; url: string }>,
  ) {
    await this.#db.$transaction(async (tx) => {
      // Update peer
      await tx.ocpiPeer.update({
        where: { id: peerId },
        data: {
          peerTokenForUs: tokenC,
          chosenVersion: version,
          status: OcpiPeerStatus.REGISTERED,
          lastUpdated: new Date(),
        },
      })

      // Replace endpoints - delete existing ones first
      await tx.ocpiPeerEndpoint.deleteMany({
        where: { peerId },
      })

      // Create new endpoints
      for (const e of endpoints) {
        await tx.ocpiPeerEndpoint.create({
          data: {
            peerId,
            module: e.identifier as OcpiModuleIdentifier,
            role: e.role.toLowerCase() as OcpiRole,
            url: e.url,
          },
        })
      }
    })
  }

  async updateFromIncomingCredentials(dto: CredentialsDto) {
    const r = dto.roles[0]

    const peer = await this.#db.ocpiPeer.updateMany({
      where: {
        countryCode: r.country_code,
        partyId: r.party_id,
      },
      data: {
        baseVersionsUrl: dto.url,
        rolesJson: dto.roles,
        ourTokenForPeer: dto.token,
        status: OcpiPeerStatus.PENDING,
        lastUpdated: new Date(),
      },
    })

    if (peer.count === 0) {
      return undefined
    }

    // Return the updated peer
    const updatedPeer = await this.#db.ocpiPeer.findUnique({
      where: {
        uq_party: {
          countryCode: r.country_code,
          partyId: r.party_id,
        },
      },
    })

    return updatedPeer
  }

  async findByCredentialsToken(credentialsToken: string) {
    // Find peer by the token they use to authenticate with us (peerTokenForUs)
    const peer = await this.#db.ocpiPeer.findFirst({
      where: {
        peerTokenForUs: credentialsToken,
        status: {
          not: OcpiPeerStatus.REVOKED,
        },
      },
    })

    if (!peer) {
      return null
    }

    // Extract business details from the first role

    const roles = peer.rolesJson as any[]
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const firstRole = roles?.[0]

    return {
      countryCode: peer.countryCode,
      partyId: peer.partyId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      role: firstRole?.role || 'UNKNOWN',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      businessDetailsName: firstRole?.business_details?.name || 'Unknown',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      businessDetailsWebsite: firstRole?.business_details?.website || null,
    }
  }

  async revokeByAuthContext(credentialsToken: string): Promise<void> {
    // Revoke the peer that uses this credentials token to authenticate with us
    await this.#db.ocpiPeer.updateMany({
      where: {
        peerTokenForUs: credentialsToken,
        status: {
          not: OcpiPeerStatus.REVOKED,
        },
      },
      data: {
        status: OcpiPeerStatus.REVOKED,
        lastUpdated: new Date(),
      },
    })
  }

  async getSelfPresentation(): Promise<CredentialsDto> {
    // Generate a fresh token C for the requesting peer
    const token = this.#tokenGen.generate()

    return Object.freeze({
      token,
      url: `${this.ocpiConfig.baseUrl}/ocpi/versions`,
      roles: [
        {
          role: 'CPO' as const,
          party_id: this.ocpiConfig.partyId,
          country_code: this.ocpiConfig.countryCode,
          business_details: {
            name: this.ocpiConfig.businessName,
            website: this.ocpiConfig.businessWebsite || undefined,
          },
        },
        {
          role: 'EMSP' as const,
          party_id: this.ocpiConfig.partyId,
          country_code: this.ocpiConfig.countryCode,
          business_details: {
            name: this.ocpiConfig.businessName,
            website: this.ocpiConfig.businessWebsite || undefined,
          },
        },
      ],
    } as const)
  }
}
