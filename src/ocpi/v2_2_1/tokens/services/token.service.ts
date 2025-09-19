import { Injectable, type Inject } from '@nestjs/common'
import { Token } from '../../../../domain/tokens/token.aggregate'
import { TokenId } from '../../../../domain/tokens/value-objects/token-id'
import { LocationReferences } from '../../../../domain/tokens/value-objects/location-references'
import { AuthorizationInfo } from '../../../../domain/tokens/value-objects/authorization-info'
import {
  TokenType,
  WhitelistType,
  AllowedType,
} from '../../../../domain/tokens/enums/token-enums'
import {
  TokenRepository,
  FindTokensParams,
  FindTokensResult,
} from '../repositories/token.repository'
import { OcpiUnknownTokenException } from '../../../../shared/exceptions/ocpi.exceptions'

@Injectable()
export class TokenService {
  constructor(
    @Inject('TokenRepository')
    private readonly tokenRepository: TokenRepository,
  ) {}

  /**
   * Get token by ID and type (for CPO Receiver Interface GET method)
   */
  async getToken(
    countryCode: string,
    partyId: string,
    uid: string,
    type: TokenType = TokenType.RFID,
  ): Promise<Token> {
    const tokenId = new TokenId(countryCode, partyId, uid)
    const token = await this.tokenRepository.findByIdAndType(tokenId, type)

    if (!token) {
      throw new OcpiUnknownTokenException(`Token ${uid} not found`)
    }

    return token
  }

  /**
   * Create or update token (for CPO Receiver Interface PUT method)
   */
  async createOrUpdateToken(token: Token): Promise<Token> {
    return await this.tokenRepository.save(token)
  }

  /**
   * Partially update token (for CPO Receiver Interface PATCH method)
   */
  async updateToken(
    countryCode: string,
    partyId: string,
    uid: string,
    type: TokenType = TokenType.RFID,
    updates: Partial<{
      valid: boolean
      whitelist: WhitelistType
      visualNumber: string
      groupId: string
      language: string
    }>,
  ): Promise<Token> {
    // First get the existing token
    const existingToken = await this.getToken(countryCode, partyId, uid, type)

    // Apply updates and create new token instance
    let updatedToken = existingToken

    if (updates.valid !== undefined && !updates.valid) {
      updatedToken = updatedToken.invalidate()
    }

    if (updates.whitelist !== undefined) {
      updatedToken = updatedToken.updateWhitelist(updates.whitelist)
    }

    // For other fields, we need to create a new token with updated values
    if (
      updates.visualNumber !== undefined ||
      updates.groupId !== undefined ||
      updates.language !== undefined
    ) {
      updatedToken = new Token(
        updatedToken.id,
        updatedToken.type,
        updatedToken.contractId,
        updatedToken.issuer,
        updatedToken.valid,
        updatedToken.whitelist,
        new Date(), // Update timestamp
        updates.visualNumber ?? updatedToken.visualNumber,
        updates.groupId ?? updatedToken.groupId,
        updates.language ?? updatedToken.language,
      )
    }

    return await this.tokenRepository.save(updatedToken)
  }

  /**
   * Get paginated list of tokens (for eMSP Sender Interface GET method)
   */
  async getTokens(params: FindTokensParams): Promise<FindTokensResult> {
    return await this.tokenRepository.findAll(params)
  }

  /**
   * Authorize token for real-time authorization (for eMSP Sender Interface POST method)
   */
  async authorizeToken(
    uid: string,
    type: TokenType = TokenType.RFID,
    locationRef?: LocationReferences,
  ): Promise<AuthorizationInfo> {
    // Find token by UID
    const token = await this.tokenRepository.findByUidAndType(uid, type)

    if (!token) {
      throw new OcpiUnknownTokenException(`Token ${uid} not found`)
    }

    // Determine authorization based on token properties and business rules
    const allowed = this.determineAuthorization(token, locationRef)

    // Create mock token data for AuthorizationInfo (avoiding circular dependencies)
    const tokenData = {
      id: token.id,
      type: token.type,
      contractId: token.contractId,
      issuer: token.issuer,
      valid: token.valid,
      whitelist: token.whitelist,
      lastUpdated: token.lastUpdated,
    }

    // Generate authorization reference for tracking
    const authorizationReference = this.generateAuthorizationReference()

    // Create display info based on authorization result
    const info = this.createDisplayInfo(allowed)

    return new AuthorizationInfo(
      allowed,
      tokenData,
      locationRef,
      authorizationReference,
      info,
    )
  }

  /**
   * Determine authorization status based on token properties and business rules
   */
  private determineAuthorization(
    token: Token,
    locationRef?: LocationReferences,
  ): AllowedType {
    // Check if token is valid
    if (!token.valid) {
      return AllowedType.BLOCKED
    }

    // Apply whitelist logic
    switch (token.whitelist) {
      case WhitelistType.ALWAYS:
        return AllowedType.ALLOWED

      case WhitelistType.NEVER:
        // In real implementation, this would call eMSP real-time API
        // For now, we'll simulate successful real-time authorization
        return this.performRealtimeAuthorization(token, locationRef)

      case WhitelistType.ALLOWED:
        // CPO can choose between cache and real-time
        // For now, we'll allow from cache if valid
        return AllowedType.ALLOWED

      case WhitelistType.ALLOWED_OFFLINE:
        // Prefer real-time, but allow offline if eMSP unreachable
        try {
          return this.performRealtimeAuthorization(token, locationRef)
        } catch {
          // Fallback to offline authorization
          return AllowedType.ALLOWED
        }

      default:
        return AllowedType.BLOCKED
    }
  }

  /**
   * Simulate real-time authorization with eMSP
   * In real implementation, this would make HTTP call to eMSP
   */
  private performRealtimeAuthorization(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _token: Token,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _locationRef?: LocationReferences,
  ): AllowedType {
    // Simulate eMSP authorization logic
    // In real implementation, this would:
    // 1. Make HTTP POST to eMSP's authorize endpoint
    // 2. Handle the response and convert to AllowedType
    // 3. Handle network errors and timeouts

    // For now, simulate successful authorization
    return AllowedType.ALLOWED
  }

  /**
   * Generate unique authorization reference for tracking
   */
  private generateAuthorizationReference(): string {
    return `AUTH${Date.now()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`
  }

  /**
   * Create display information based on authorization result
   */
  private createDisplayInfo(allowed: AllowedType) {
    const messages = {
      [AllowedType.ALLOWED]: 'Welcome! You are authorized to charge.',
      [AllowedType.BLOCKED]: 'Access denied. Token is blocked.',
      [AllowedType.EXPIRED]: 'Access denied. Token has expired.',
      [AllowedType.NO_CREDIT]: 'Access denied. Insufficient credit.',
      [AllowedType.NOT_ALLOWED]: 'Access denied. Not allowed at this location.',
    }

    return {
      language: 'en',
      text: messages[allowed],
    }
  }
}
