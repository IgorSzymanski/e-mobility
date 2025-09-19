import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

export interface CDRDimension {
  readonly type: CdrDimensionType
  readonly volume: number
}

export type CdrDimensionType =
  | 'CURRENT'
  | 'ENERGY'
  | 'MAX_CURRENT'
  | 'MIN_CURRENT'
  | 'MAX_POWER'
  | 'MIN_POWER'
  | 'PARKING_TIME'
  | 'POWER'
  | 'RESERVATION_TIME'
  | 'STATE_OF_CHARGE'
  | 'TIME'

const CDRDimensionSchema = z.object({
  type: z.enum([
    'CURRENT',
    'ENERGY',
    'MAX_CURRENT',
    'MIN_CURRENT',
    'MAX_POWER',
    'MIN_POWER',
    'PARKING_TIME',
    'POWER',
    'RESERVATION_TIME',
    'STATE_OF_CHARGE',
    'TIME',
  ]),
  volume: z.number().nonnegative('Dimension volume cannot be negative'),
})

const ChargingPeriodSchema = z.object({
  dimensions: z
    .array(CDRDimensionSchema)
    .min(1, 'Charging period must have at least one dimension'),
})

export class ChargingPeriod {
  constructor(
    private readonly _startDateTime: Date,
    private readonly _dimensions: ReadonlyArray<CDRDimension>,
    private readonly _tariffId?: string,
  ) {
    this.validate()
  }

  get startDateTime(): Date {
    return this._startDateTime
  }

  get dimensions(): ReadonlyArray<CDRDimension> {
    return this._dimensions
  }

  get tariffId(): string | undefined {
    return this._tariffId
  }

  private validate(): void {
    const result = ChargingPeriodSchema.safeParse({
      dimensions: this._dimensions,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  getEnergyConsumed(): number {
    const energyDimension = this._dimensions.find((d) => d.type === 'ENERGY')
    return energyDimension?.volume || 0
  }

  getDuration(): number {
    const timeDimension = this._dimensions.find((d) => d.type === 'TIME')
    return timeDimension?.volume || 0
  }

  equals(other: ChargingPeriod): boolean {
    return (
      this._startDateTime.getTime() === other._startDateTime.getTime() &&
      this._tariffId === other._tariffId &&
      this._dimensions.length === other._dimensions.length &&
      this._dimensions.every(
        (dim, index) =>
          dim.type === other._dimensions[index].type &&
          dim.volume === other._dimensions[index].volume,
      )
    )
  }
}
