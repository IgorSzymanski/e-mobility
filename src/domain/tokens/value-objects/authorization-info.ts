import { z } from 'zod'
import { AllowedType } from '../enums/token-enums'
import { LocationReferences } from './location-references'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

export interface DisplayText {
  readonly language: string
  readonly text: string
}

export interface TokenData {
  readonly id: any // Will be TokenId but avoiding circular reference in tests
  readonly type: any
  readonly contractId: string
  readonly issuer: string
  readonly valid: boolean
  readonly whitelist: any
  readonly lastUpdated: Date
}

const DisplayTextSchema = z.object({
  language: z.string().min(1, 'Language cannot be empty'),
  text: z.string().min(1, 'Text cannot be empty'),
})

const AuthorizationInfoSchema = z.object({
  authorizationReference: z
    .string()
    .min(1, 'Authorization reference cannot be empty')
    .max(36, 'Authorization reference must be max 36 characters')
    .optional(),
  info: DisplayTextSchema.optional(),
})

export class AuthorizationInfo {
  constructor(
    private readonly _allowed: AllowedType,
    private readonly _token: TokenData,
    private readonly _location?: LocationReferences,
    private readonly _authorizationReference?: string,
    private readonly _info?: DisplayText,
  ) {
    this.validate()
  }

  get allowed(): AllowedType {
    return this._allowed
  }

  get token(): TokenData {
    return this._token
  }

  get location(): LocationReferences | undefined {
    return this._location
  }

  get authorizationReference(): string | undefined {
    return this._authorizationReference
  }

  get info(): DisplayText | undefined {
    return this._info
  }

  isAllowed(): boolean {
    return this._allowed === AllowedType.ALLOWED
  }

  private validate(): void {
    const result = AuthorizationInfoSchema.safeParse({
      authorizationReference: this._authorizationReference,
      info: this._info,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }
}
