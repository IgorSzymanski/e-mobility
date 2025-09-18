/* eslint-disable @typescript-eslint/require-await */
// infrastructure/persistence/peers.repository.ts
import { Injectable } from '@nestjs/common'
import {
  PrismaClient,
  OcpiVersion,
  OcpiPeerStatus,
  OcpiModuleIdentifier,
  OcpiRole,
} from '@prisma/client'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import type { CredentialsDto } from '@/ocpi/v2_2_1/credentials/dto/credentials.dto'

@Injectable()
export class PeersRepository {
  readonly #db: PrismaClient
  constructor(
    db: PrismaClient,
    private readonly ocpiConfig: OcpiConfigService,
  ) {
    this.#db = db
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
        chosenVersion: OcpiVersion.v2_2_1, // temporary until negotiate
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
          chosenVersion: version as OcpiVersion,
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

  async revokeByAuthContext(): Promise<void> {
    // Look up calling token C from request context (inject in guard), then revoke:
    // UPDATE ocpi.peers SET status='REVOKED' WHERE peer_token_for_us = $1
  }

  async getSelfPresentation(): Promise<CredentialsDto> {
    // Return your own CredentialsDto (token C for this caller context + roles + versions URL)
    // You may compute per-tenant token C if you run multi-tenant.
    return Object.freeze({
      token: '<your-current-C-for-this-peer>',
      url: `${this.ocpiConfig.baseUrl}/ocpi/versions`,
      roles: [
        {
          role: 'CPO',
          party_id: 'IGI',
          country_code: 'PL',
          business_details: { name: 'Spirii' },
        },
        {
          role: 'EMSP',
          party_id: 'IGI',
          country_code: 'PL',
          business_details: { name: 'Spirii' },
        },
      ],
    } as const)
  }
}
