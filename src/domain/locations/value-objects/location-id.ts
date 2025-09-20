import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const LocationIdSchema = z.object({
  countryCode: z
    .string()
    .length(2, 'Country code must be exactly 2 characters'),
  partyId: z.string().length(3, 'Party ID must be exactly 3 characters'),
  id: z
    .string()
    .min(1, 'Location ID cannot be empty')
    .max(36, 'Location ID must be max 36 characters'),
})

export class LocationId {
  constructor(
    private readonly _countryCode: string,
    private readonly _partyId: string,
    private readonly _id: string,
  ) {
    this.validate()
  }

  get countryCode(): string {
    return this._countryCode
  }

  get partyId(): string {
    return this._partyId
  }

  get id(): string {
    return this._id
  }

  private validate(): void {
    const result = LocationIdSchema.safeParse({
      countryCode: this._countryCode,
      partyId: this._partyId,
      id: this._id,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other: LocationId): boolean {
    return (
      this._countryCode === other._countryCode &&
      this._partyId === other._partyId &&
      this._id === other._id
    )
  }
}
