import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const LocationReferencesSchema = z.object({
  locationId: z
    .string()
    .trim()
    .min(1, 'Location ID cannot be empty')
    .max(36, 'Location ID must be max 36 characters'),
  evseUids: z
    .array(
      z
        .string()
        .trim()
        .min(1, 'EVSE UID cannot be empty')
        .max(36, 'EVSE UID must be max 36 characters'),
    )
    .optional(),
})

export class LocationReferences {
  constructor(
    private readonly _locationId: string,
    private readonly _evseUids: ReadonlyArray<string> = [],
  ) {
    this.validate()
  }

  get locationId(): string {
    return this._locationId
  }

  get evseUids(): ReadonlyArray<string> {
    return this._evseUids
  }

  hasEvseRestrictions(): boolean {
    return this._evseUids.length > 0
  }

  isEvseAllowed(evseUid: string): boolean {
    if (!this.hasEvseRestrictions()) {
      return true
    }
    return this._evseUids.includes(evseUid)
  }

  filterEvses(allEvseUids: ReadonlyArray<string>): ReadonlyArray<string> {
    if (!this.hasEvseRestrictions()) {
      return allEvseUids
    }
    return allEvseUids.filter((evseUid) => this._evseUids.includes(evseUid))
  }

  private validate(): void {
    const result = LocationReferencesSchema.safeParse({
      locationId: this._locationId,
      evseUids: this._evseUids,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other: LocationReferences): boolean {
    return (
      this._locationId === other._locationId &&
      this._evseUids.length === other._evseUids.length &&
      this._evseUids.every((uid, index) => uid === other._evseUids[index])
    )
  }
}
