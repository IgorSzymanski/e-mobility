import { z } from 'zod'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const ConnectorSchema = z.object({
  id: z.string().min(1, 'Connector ID cannot be empty').trim(),
  maxVoltage: z.number().positive('Max voltage must be positive'),
  maxAmperage: z.number().positive('Max amperage must be positive'),
  maxElectricPower: z
    .number()
    .positive('Max electric power must be positive')
    .optional(),
})

export type ConnectorType =
  | 'CHADEMO'
  | 'CHAOJI'
  | 'DOMESTIC_A'
  | 'DOMESTIC_B'
  | 'DOMESTIC_C'
  | 'DOMESTIC_D'
  | 'DOMESTIC_E'
  | 'DOMESTIC_F'
  | 'DOMESTIC_G'
  | 'DOMESTIC_H'
  | 'DOMESTIC_I'
  | 'DOMESTIC_J'
  | 'DOMESTIC_K'
  | 'DOMESTIC_L'
  | 'DOMESTIC_M'
  | 'DOMESTIC_N'
  | 'DOMESTIC_O'
  | 'GBT_AC'
  | 'GBT_DC'
  | 'IEC_60309_2_single_16'
  | 'IEC_60309_2_three_16'
  | 'IEC_60309_2_three_32'
  | 'IEC_60309_2_three_64'
  | 'IEC_62196_T1'
  | 'IEC_62196_T1_COMBO'
  | 'IEC_62196_T2'
  | 'IEC_62196_T2_COMBO'
  | 'IEC_62196_T3A'
  | 'IEC_62196_T3C'
  | 'NEMA_5_20'
  | 'NEMA_6_30'
  | 'NEMA_6_50'
  | 'NEMA_10_30'
  | 'NEMA_10_50'
  | 'NEMA_14_30'
  | 'NEMA_14_50'
  | 'PANTOGRAPH_BOTTOM_UP'
  | 'PANTOGRAPH_TOP_DOWN'
  | 'TESLA_R'
  | 'TESLA_S'

export type ConnectorFormat = 'SOCKET' | 'CABLE'
export type PowerType =
  | 'AC_1_PHASE'
  | 'AC_2_PHASE'
  | 'AC_2_PHASE_SPLIT'
  | 'AC_3_PHASE'
  | 'DC'

export class Connector {
  constructor(
    private readonly _id: string,
    private readonly _standard: ConnectorType,
    private readonly _format: ConnectorFormat,
    private readonly _powerType: PowerType,
    private readonly _maxVoltage: number,
    private readonly _maxAmperage: number,
    private readonly _lastUpdated: Date,
    private readonly _maxElectricPower?: number,
    private readonly _tariffIds?: ReadonlyArray<string>,
    private readonly _termsAndConditions?: string,
  ) {
    this.validate()
  }

  get id(): string {
    return this._id
  }

  get standard(): ConnectorType {
    return this._standard
  }

  get format(): ConnectorFormat {
    return this._format
  }

  get powerType(): PowerType {
    return this._powerType
  }

  get maxVoltage(): number {
    return this._maxVoltage
  }

  get maxAmperage(): number {
    return this._maxAmperage
  }

  get maxElectricPower(): number | undefined {
    return this._maxElectricPower
  }

  get tariffIds(): ReadonlyArray<string> | undefined {
    return this._tariffIds
  }

  get termsAndConditions(): string | undefined {
    return this._termsAndConditions
  }

  get lastUpdated(): Date {
    return this._lastUpdated
  }

  private validate(): void {
    const result = ConnectorSchema.safeParse({
      id: this._id,
      maxVoltage: this._maxVoltage,
      maxAmperage: this._maxAmperage,
      maxElectricPower: this._maxElectricPower,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  updateTermsAndConditions(termsAndConditions: string): Connector {
    return new Connector(
      this._id,
      this._standard,
      this._format,
      this._powerType,
      this._maxVoltage,
      this._maxAmperage,
      new Date(),
      this._maxElectricPower,
      this._tariffIds,
      termsAndConditions,
    )
  }

  updateTariffs(tariffIds: ReadonlyArray<string>): Connector {
    return new Connector(
      this._id,
      this._standard,
      this._format,
      this._powerType,
      this._maxVoltage,
      this._maxAmperage,
      new Date(),
      this._maxElectricPower,
      tariffIds,
      this._termsAndConditions,
    )
  }

  equals(other: Connector): boolean {
    return this._id === other._id
  }
}
