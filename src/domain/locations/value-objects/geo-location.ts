import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const GeoLocationSchema = z.object({
  latitude: z.string().refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num >= -90 && num <= 90
    },
    { message: 'Invalid latitude: must be between -90 and 90' },
  ),
  longitude: z.string().refine(
    (val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num >= -180 && num <= 180
    },
    { message: 'Invalid longitude: must be between -180 and 180' },
  ),
})

export class GeoLocation {
  constructor(
    private readonly _latitude: string,
    private readonly _longitude: string,
  ) {
    this.validateCoordinates()
  }

  get latitude(): string {
    return this._latitude
  }

  get longitude(): string {
    return this._longitude
  }

  private validateCoordinates(): void {
    const result = GeoLocationSchema.safeParse({
      latitude: this._latitude,
      longitude: this._longitude,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other: GeoLocation): boolean {
    return (
      this._latitude === other._latitude && this._longitude === other._longitude
    )
  }
}
