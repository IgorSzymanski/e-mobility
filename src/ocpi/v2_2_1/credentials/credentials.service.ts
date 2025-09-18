// ocpi/v2_2_1/credentials/credentials.service.ts
import { Injectable } from '@nestjs/common'
import type { CredentialsDto } from './dto/credentials.dto'
import { PeersRepository } from '@/infrastructure/persistence/peers.repository'
import { VersionsClient221 } from '@/ocpi/v2_2_1/versions/versions.client'
import { TokenGenerator } from '@/infrastructure/security/token-generator'
import { BootstrapTokensService } from '@/admin/bootstrap-tokens/bootstrap-tokens.service'
import { OcpiInvalidParametersException } from '@/shared/exceptions/ocpi.exceptions'

@Injectable()
export class CredentialsService221 {
  readonly #peers: PeersRepository
  readonly #versions: VersionsClient221
  readonly #tokenGen: TokenGenerator
  readonly #bootstrapTokens: BootstrapTokensService

  constructor(
    peers: PeersRepository,
    versions: VersionsClient221,
    tokenGen: TokenGenerator,
    bootstrapTokens: BootstrapTokensService,
  ) {
    this.#peers = peers
    this.#versions = versions
    this.#tokenGen = tokenGen
    this.#bootstrapTokens = bootstrapTokens
  }

  async getOurCredentials(): Promise<CredentialsDto> {
    // Produce YOUR credentials object (token C or current), including roles and /versions URL
    const self = await this.#peers.getSelfPresentation() // your business_details/roles
    return Object.freeze(self)
  }

  // POST: receiver side of OCPI registration
  async handlePost(
    client: CredentialsDto,
    bootstrapToken?: string,
  ): Promise<CredentialsDto> {
    // 1) Store client's B (we will use B when calling them)
    // 2) Fetch client /versions using B, pick common version, fetch /version_details
    // 3) Generate our C, store C for this peer (they'll use it in Authorization)
    // 4) Return OUR credentials (with token C) to complete A→B→C handshake
    const peer = await this.#peers.upsertFromIncomingCredentials(client) // stores B, url, roles
    const chosen = await this.#versions.negotiateWithPeer(peer) // /versions → /version_details
    const tokenC = this.#tokenGen.generate() // random, printable ASCII
    await this.#peers.setPeerTokenForUs(
      peer.id,
      tokenC,
      chosen.version,
      chosen.endpoints,
    )

    // Mark bootstrap token as used upon successful registration
    if (bootstrapToken) {
      const firstRole = client.roles[0]
      const usedBy = `${firstRole?.country_code || 'XX'}-${firstRole?.party_id || 'UNKNOWN'}`
      await this.#bootstrapTokens.markTokenAsUsed(bootstrapToken, usedBy)
    }

    return this.getOurCredentials()
  }

  // PUT: rotate/update (or switch version), same storage as POST but peer already exists
  async handlePut(client: CredentialsDto): Promise<CredentialsDto> {
    const peer = await this.#peers.updateFromIncomingCredentials(client)
    if (!peer) {
      throw new OcpiInvalidParametersException(
        'Peer not found for credentials update',
      )
    }
    const chosen = await this.#versions.negotiateWithPeer(peer)
    const tokenC = this.#tokenGen.generate()
    await this.#peers.setPeerTokenForUs(
      peer.id,
      tokenC,
      chosen.version,
      chosen.endpoints,
    )
    return this.getOurCredentials()
  }

  async handleDelete(credentialsToken: string): Promise<void> {
    await this.#peers.revokeByAuthContext(credentialsToken) // revokes the peer using this token
  }
}
