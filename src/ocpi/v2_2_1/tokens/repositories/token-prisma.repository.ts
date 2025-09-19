import { Injectable } from '@nestjs/common'
import {
  PrismaClient,
  OcpiTokenType,
  OcpiWhitelistType,
  type OcpiToken,
} from '@prisma/client'
import { Token } from '@/domain/tokens/token.aggregate'
import { TokenId } from '@/domain/tokens/value-objects/token-id'
import { TokenType, WhitelistType } from '@/domain/tokens/enums/token-enums'
import {
  TokenRepository,
  FindTokensParams,
  FindTokensResult,
} from './token.repository'

// Type mapping utilities
const tokenTypeFromPrisma = (prismaType: OcpiTokenType): TokenType => {
  switch (prismaType) {
    case 'RFID':
      return TokenType.RFID
    case 'APP_USER':
      return TokenType.APP_USER
    case 'AD_HOC_USER':
      return TokenType.AD_HOC_USER
    case 'OTHER':
      return TokenType.OTHER
    default:
      return TokenType.RFID
  }
}

const tokenTypeToPrisma = (type: TokenType): OcpiTokenType => {
  switch (type) {
    case TokenType.RFID:
      return 'RFID'
    case TokenType.APP_USER:
      return 'APP_USER'
    case TokenType.AD_HOC_USER:
      return 'AD_HOC_USER'
    case TokenType.OTHER:
      return 'OTHER'
    default:
      return 'RFID'
  }
}

const whitelistTypeFromPrisma = (
  prismaType: OcpiWhitelistType,
): WhitelistType => {
  switch (prismaType) {
    case 'ALWAYS':
      return WhitelistType.ALWAYS
    case 'ALLOWED':
      return WhitelistType.ALLOWED
    case 'ALLOWED_OFFLINE':
      return WhitelistType.ALLOWED_OFFLINE
    case 'NEVER':
      return WhitelistType.NEVER
    default:
      return WhitelistType.NEVER
  }
}

const whitelistTypeToPrisma = (type: WhitelistType): OcpiWhitelistType => {
  switch (type) {
    case WhitelistType.ALWAYS:
      return 'ALWAYS'
    case WhitelistType.ALLOWED:
      return 'ALLOWED'
    case WhitelistType.ALLOWED_OFFLINE:
      return 'ALLOWED_OFFLINE'
    case WhitelistType.NEVER:
      return 'NEVER'
    default:
      return 'NEVER'
  }
}

@Injectable()
export class TokenPrismaRepository implements TokenRepository {
  readonly #db: PrismaClient

  constructor(db: PrismaClient) {
    this.#db = db
  }

  async findByIdAndType(
    tokenId: TokenId,
    type: TokenType = TokenType.RFID,
  ): Promise<Token | null> {
    const prismaToken = await this.#db.ocpiToken.findFirst({
      where: {
        countryCode: tokenId.countryCode,
        partyId: tokenId.partyId,
        uid: tokenId.uid,
        type: tokenTypeToPrisma(type),
      },
    })

    if (!prismaToken) {
      return null
    }

    return this.toDomain(prismaToken)
  }

  async findByUidAndType(
    uid: string,
    type: TokenType = TokenType.RFID,
  ): Promise<Token | null> {
    const prismaToken = await this.#db.ocpiToken.findFirst({
      where: {
        uid,
        type: tokenTypeToPrisma(type),
      },
    })

    if (!prismaToken) {
      return null
    }

    return this.toDomain(prismaToken)
  }

  async save(token: Token): Promise<Token> {
    const data = {
      countryCode: token.id.countryCode,
      partyId: token.id.partyId,
      uid: token.id.uid,
      type: tokenTypeToPrisma(token.type),
      contractId: token.contractId,
      visualNumber: token.visualNumber,
      issuer: token.issuer,
      groupId: token.groupId,
      valid: token.valid,
      whitelist: whitelistTypeToPrisma(token.whitelist),
      language: token.language,
      lastUpdated: token.lastUpdated,
    }

    const savedToken = await this.#db.ocpiToken.upsert({
      where: {
        uq_token_id: {
          countryCode: token.id.countryCode,
          partyId: token.id.partyId,
          uid: token.id.uid,
        },
      },
      update: data,
      create: data,
    })

    return this.toDomain(savedToken)
  }

  async findAll(params: FindTokensParams): Promise<FindTokensResult> {
    const where = {
      ...(params.dateFrom && { lastUpdated: { gte: params.dateFrom } }),
      ...(params.dateTo && {
        lastUpdated: {
          ...(params.dateFrom ? { gte: params.dateFrom } : {}),
          lte: params.dateTo,
        },
      }),
      ...(params.countryCode && { countryCode: params.countryCode }),
      ...(params.partyId && { partyId: params.partyId }),
    }

    const [tokens, totalCount] = await Promise.all([
      this.#db.ocpiToken.findMany({
        where,
        orderBy: { lastUpdated: 'desc' },
        skip: params.offset ?? 0,
        take: params.limit ?? 100,
      }),
      this.#db.ocpiToken.count({ where }),
    ])

    const domainTokens = tokens.map((token) => this.toDomain(token))
    const offset = params.offset ?? 0
    const hasMore = offset + tokens.length < totalCount

    return {
      tokens: domainTokens,
      totalCount,
      hasMore,
    }
  }

  async count(
    params: Omit<FindTokensParams, 'offset' | 'limit'>,
  ): Promise<number> {
    const where = {
      ...(params.dateFrom && { lastUpdated: { gte: params.dateFrom } }),
      ...(params.dateTo && {
        lastUpdated: {
          ...(params.dateFrom ? { gte: params.dateFrom } : {}),
          lte: params.dateTo,
        },
      }),
      ...(params.countryCode && { countryCode: params.countryCode }),
      ...(params.partyId && { partyId: params.partyId }),
    }

    return await this.#db.ocpiToken.count({ where })
  }

  async delete(tokenId: TokenId): Promise<void> {
    await this.#db.ocpiToken.deleteMany({
      where: {
        countryCode: tokenId.countryCode,
        partyId: tokenId.partyId,
        uid: tokenId.uid,
      },
    })
  }

  private toDomain(prismaToken: OcpiToken): Token {
    const tokenId = new TokenId(
      prismaToken.countryCode,
      prismaToken.partyId,
      prismaToken.uid,
    )

    return new Token(
      tokenId,
      tokenTypeFromPrisma(prismaToken.type),
      prismaToken.contractId,
      prismaToken.issuer,
      prismaToken.valid,
      whitelistTypeFromPrisma(prismaToken.whitelist),
      new Date(prismaToken.lastUpdated),
      prismaToken.visualNumber || undefined,
      prismaToken.groupId || undefined,
      prismaToken.language || undefined,
    )
  }
}
