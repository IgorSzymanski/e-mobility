import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const TokenIdSchema = z.object({
  countryCode: z
    .string()
    .length(2, 'Country code must be exactly 2 characters'),
  partyId: z.string().length(3, 'Party ID must be exactly 3 characters'),
  uid: z
    .string()
    .min(1, 'Token UID cannot be empty')
    .max(36, 'Token UID must be max 36 characters'),
})

export class TokenId {
  constructor(
    private readonly _countryCode: string,
    private readonly _partyId: string,
    private readonly _uid: string,
  ) {
    this.validate()
  }

  static fromString(tokenIdString: string): TokenId {
    const parts = tokenIdString.split('*')

    if (parts.length !== 3) {
      throw new OcpiInvalidParametersException(
        'Token ID string must be in format: XX*XXX*XXXXXXXX',
      )
    }

    const [countryCode, partyId, uid] = parts
    return new TokenId(countryCode, partyId, uid)
  }

  get countryCode(): string {
    return this._countryCode
  }

  get partyId(): string {
    return this._partyId
  }

  get uid(): string {
    return this._uid
  }

  get value(): string {
    return `${this._countryCode}*${this._partyId}*${this._uid}`
  }

  private validate(): void {
    const result = TokenIdSchema.safeParse({
      countryCode: this._countryCode,
      partyId: this._partyId,
      uid: this._uid,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other: TokenId): boolean {
    return this.value === other.value
  }
}
