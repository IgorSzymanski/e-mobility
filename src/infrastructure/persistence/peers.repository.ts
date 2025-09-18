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
import { CredentialsRoleSchema } from '@/ocpi/v2_2_1/credentials/dto/credentials.dto'
import { z } from 'zod'

// Schema for validating rolesJson from database
const RolesJsonSchema = z.array(CredentialsRoleSchema)

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

  /**
   * Safely parse rolesJson from database using Zod schema
   */
  private parseRolesJson(
    rolesJson: unknown,
  ): z.infer<typeof CredentialsRoleSchema>[] {
    const result = RolesJsonSchema.safeParse(rolesJson)
    if (!result.success) {
      console.warn('Invalid rolesJson format:', result.error)
      return []
    }
    return result.data
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
        // Map OCPI role values to our internal enum
        // OCPI uses SENDER/RECEIVER, we need to map to actual party roles
        // For now, we'll derive the role from the peer's roles since SENDER/RECEIVER
        // doesn't directly map to CPO/EMSP
        const peerData = await tx.ocpiPeer.findUnique({
          where: { id: peerId },
          select: { rolesJson: true },
        })

        if (!peerData) continue

        const roles = this.parseRolesJson(peerData.rolesJson)
        const primaryRole = roles[0]?.role?.toLowerCase()

        // Use the peer's primary role since SENDER/RECEIVER is context-dependent
        const mappedRole =
          primaryRole === 'cpo' || primaryRole === 'emsp'
            ? (primaryRole as OcpiRole)
            : ('emsp' as OcpiRole) // Default fallback

        await tx.ocpiPeerEndpoint.create({
          data: {
            peerId,
            module: e.identifier as OcpiModuleIdentifier,
            role: mappedRole,
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
    const roles = this.parseRolesJson(peer.rolesJson)
    const firstRole = roles[0]

    return {
      countryCode: peer.countryCode,
      partyId: peer.partyId,
      role: firstRole?.role || 'UNKNOWN',
      businessDetailsName: firstRole?.business_details?.name || 'Unknown',
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
