import { z } from 'zod'
import { TokenId } from './value-objects/token-id'
import { TokenType, WhitelistType } from './enums/token-enums'
import { OcpiInvalidParametersException } from '../../shared/exceptions/ocpi.exceptions'

const TokenSchema = z.object({
  contractId: z
    .string()
    .min(1, 'Contract ID cannot be empty')
    .max(36, 'Contract ID must be max 36 characters')
    .trim(),
  issuer: z
    .string()
    .min(1, 'Issuer cannot be empty')
    .max(64, 'Issuer must be max 64 characters')
    .trim(),
  visualNumber: z
    .string()
    .max(64, 'Visual number must be max 64 characters')
    .optional(),
  groupId: z
    .string()
    .max(36, 'Group ID must be max 36 characters')
    .optional(),
  language: z
    .string()
    .length(2, 'Language must be exactly 2 characters (ISO 639-1)')
    .optional(),
})

export class Token {
  constructor(
    private readonly _id: TokenId,
    private readonly _type: TokenType,
    private readonly _contractId: string,
    private readonly _issuer: string,
    private readonly _valid: boolean,
    private readonly _whitelist: WhitelistType,
    private readonly _lastUpdated: Date,
    private readonly _visualNumber?: string,
    private readonly _groupId?: string,
    private readonly _language?: string,
  ) {
    this.validate()
  }

  get id(): TokenId {
    return this._id
  }

  get type(): TokenType {
    return this._type
  }

  get contractId(): string {
    return this._contractId
  }

  get issuer(): string {
    return this._issuer
  }

  get valid(): boolean {
    return this._valid
  }

  get whitelist(): WhitelistType {
    return this._whitelist
  }

  get lastUpdated(): Date {
    return this._lastUpdated
  }

  get visualNumber(): string | undefined {
    return this._visualNumber
  }

  get groupId(): string | undefined {
    return this._groupId
  }

  get language(): string | undefined {
    return this._language
  }

  invalidate(): Token {
    return new Token(
      this._id,
      this._type,
      this._contractId,
      this._issuer,
      false, // Set valid to false
      this._whitelist,
      new Date(), // Update timestamp
      this._visualNumber,
      this._groupId,
      this._language,
    )
  }

  updateWhitelist(whitelist: WhitelistType): Token {
    return new Token(
      this._id,
      this._type,
      this._contractId,
      this._issuer,
      this._valid,
      whitelist, // Update whitelist
      new Date(), // Update timestamp
      this._visualNumber,
      this._groupId,
      this._language,
    )
  }

  isWhitelisted(): boolean {
    return this._whitelist === WhitelistType.ALWAYS
  }

  requiresRealtimeAuth(): boolean {
    return this._whitelist !== WhitelistType.ALWAYS
  }

  canBeUsedOffline(): boolean {
    return (
      this._whitelist === WhitelistType.ALWAYS ||
      this._whitelist === WhitelistType.ALLOWED_OFFLINE
    )
  }

  private validate(): void {
    const result = TokenSchema.safeParse({
      contractId: this._contractId,
      issuer: this._issuer,
      visualNumber: this._visualNumber,
      groupId: this._groupId,
      language: this._language,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other: Token): boolean {
    return this._id.equals(other._id)
  }
}