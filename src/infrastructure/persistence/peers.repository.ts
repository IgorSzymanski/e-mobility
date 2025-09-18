/* eslint-disable @typescript-eslint/require-await */
// infrastructure/persistence/peers.repository.ts
import { Injectable, Logger } from '@nestjs/common'
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

// Schema for validating OCPI module identifiers
const OcpiModuleIdentifierSchema = z.enum([
  'sessions',
  'cdrs',
  'locations',
  'tokens',
  'commands',
  'tariffs',
  'credentials',
  'versions',
])

// Type guard for OcpiRole
const isValidOcpiRole = (role: string): role is OcpiRole => {
  return role === 'cpo' || role === 'emsp'
}

@Injectable()
export class PeersRepository {
  private readonly logger = new Logger(PeersRepository.name)
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
      this.logger.warn('Invalid rolesJson format', result.error)
      return []
    }
    return result.data
  }

  /**
   * Safely validate OCPI module identifier
   */
  private parseModuleIdentifier(
    identifier: string,
  ): OcpiModuleIdentifier | null {
    const result = OcpiModuleIdentifierSchema.safeParse(identifier)
    if (!result.success) {
      this.logger.warn('Invalid OCPI module identifier', identifier)
      return null
    }
    return result.data
  }

  async upsertFromIncomingCredentials(dto: CredentialsDto) {
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
      await tx.ocpiPeer.update({
        where: { id: peerId },
        data: {
          peerTokenForUs: tokenC,
          chosenVersion: version,
          status: OcpiPeerStatus.REGISTERED,
          lastUpdated: new Date(),
        },
      })

      await tx.ocpiPeerEndpoint.deleteMany({
        where: { peerId },
      })

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
        const mappedRole: OcpiRole = isValidOcpiRole(primaryRole)
          ? primaryRole
          : 'emsp' // Default fallback

        // Validate the module identifier
        const moduleIdentifier = this.parseModuleIdentifier(e.identifier)
        if (!moduleIdentifier) {
          this.logger.warn('Skipping invalid module identifier', e.identifier)
          continue
        }

        await tx.ocpiPeerEndpoint.create({
          data: {
            peerId,
            module: moduleIdentifier,
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
