import { Token } from '@/domain/tokens/token.aggregate'
import { TokenId } from '@/domain/tokens/value-objects/token-id'
import { TokenType } from '@/domain/tokens/enums/token-enums'

export interface TokenRepository {
  /**
   * Find token by ID and type
   */
  findByIdAndType(tokenId: TokenId, type?: TokenType): Promise<Token | null>

  /**
   * Find token by UID and type (for authorization requests)
   */
  findByUidAndType(uid: string, type?: TokenType): Promise<Token | null>

  /**
   * Save or update token
   */
  save(token: Token): Promise<Token>

  /**
   * Find all tokens with pagination and date filtering
   */
  findAll(params: FindTokensParams): Promise<FindTokensResult>

  /**
   * Count total tokens for pagination
   */
  count(params: Omit<FindTokensParams, 'offset' | 'limit'>): Promise<number>

  /**
   * Delete token (used for testing/cleanup)
   */
  delete(tokenId: TokenId): Promise<void>
}

export interface FindTokensParams {
  dateFrom?: Date
  dateTo?: Date
  offset?: number
  limit?: number
  countryCode?: string
  partyId?: string
}

export interface FindTokensResult {
  tokens: Token[]
  totalCount: number
  hasMore: boolean
}
