import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const EnergyMeasurementSchema = z.object({
  kwh: z.number().nonnegative('Energy consumption cannot be negative'),
})

export class EnergyMeasurement {
  constructor(
    private readonly _kwh: number,
    private readonly _timestamp: Date,
  ) {
    this.validate()
  }

  get kwh(): number {
    return this._kwh
  }

  get timestamp(): Date {
    return this._timestamp
  }

  private validate(): void {
    const result = EnergyMeasurementSchema.safeParse({
      kwh: this._kwh,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  equals(other: EnergyMeasurement): boolean {
    return (
      this._kwh === other._kwh &&
      this._timestamp.getTime() === other._timestamp.getTime()
    )
  }
}
