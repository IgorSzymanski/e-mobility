import { z } from 'zod'
import { SessionId } from './value-objects/session-id'
// import { EnergyMeasurement } from './value-objects/energy-measurement' // TODO: Remove if not needed
import { ChargingPeriod } from './value-objects/charging-period'
import {
  OcpiInvalidParametersException,
  OcpiGenericServerException,
} from '../../shared/exceptions/ocpi.exceptions'

const SessionSchema = z.object({
  cdrToken: z.string().min(1, 'CDR token cannot be empty').trim(),
  locationId: z.string().min(1, 'Location ID cannot be empty').trim(),
  evseUid: z.string().min(1, 'EVSE UID cannot be empty').trim(),
  connectorId: z.string().min(1, 'Connector ID cannot be empty').trim(),
  currency: z.string().length(3, 'Currency must be 3 characters (ISO 4217)'),
  kwh: z.number().nonnegative('Energy consumption cannot be negative'),
  totalCost: z.number().nonnegative('Total cost cannot be negative').optional(),
})

export type SessionStatus =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'INVALID'
  | 'PENDING'
  | 'RESERVED'

export type AuthMethod = 'AUTH_REQUEST' | 'COMMAND' | 'WHITELIST'

export interface LocationReference {
  readonly locationId: string
  readonly evseUid: string
  readonly connectorId: string
}

export interface ChargingPreferences {
  readonly profileType: ProfileType
  readonly departureTime?: Date
  readonly energyNeed?: number
  readonly dischargeAllowed?: boolean
}

export type ProfileType = 'CHEAP' | 'FAST' | 'GREEN' | 'REGULAR'

export class Session {
  constructor(
    private readonly _id: SessionId,
    private readonly _startDateTime: Date,
    private readonly _kwh: number,
    private readonly _cdrToken: string,
    private readonly _authMethod: AuthMethod,
    private readonly _authorizationReference?: string,
    private readonly _locationId: string,
    private readonly _evseUid: string,
    private readonly _connectorId: string,
    private readonly _meterId?: string,
    private readonly _currency: string,
    private readonly _status: SessionStatus,
    private readonly _lastUpdated: Date,
    private readonly _endDateTime?: Date,
    private readonly _chargingPeriods?: ReadonlyArray<ChargingPeriod>,
    private readonly _totalCost?: number,
    private readonly _chargingPreferences?: ChargingPreferences,
  ) {
    this.validate()
  }

  get id(): SessionId {
    return this._id
  }

  get startDateTime(): Date {
    return this._startDateTime
  }

  get endDateTime(): Date | undefined {
    return this._endDateTime
  }

  get kwh(): number {
    return this._kwh
  }

  get cdrToken(): string {
    return this._cdrToken
  }

  get authMethod(): AuthMethod {
    return this._authMethod
  }

  get authorizationReference(): string | undefined {
    return this._authorizationReference
  }

  get location(): LocationReference {
    return {
      locationId: this._locationId,
      evseUid: this._evseUid,
      connectorId: this._connectorId,
    }
  }

  get meterId(): string | undefined {
    return this._meterId
  }

  get currency(): string {
    return this._currency
  }

  get chargingPeriods(): ReadonlyArray<ChargingPeriod> | undefined {
    return this._chargingPeriods
  }

  get totalCost(): number | undefined {
    return this._totalCost
  }

  get status(): SessionStatus {
    return this._status
  }

  get chargingPreferences(): ChargingPreferences | undefined {
    return this._chargingPreferences
  }

  get lastUpdated(): Date {
    return this._lastUpdated
  }

  private validate(): void {
    const result = SessionSchema.safeParse({
      cdrToken: this._cdrToken,
      locationId: this._locationId,
      evseUid: this._evseUid,
      connectorId: this._connectorId,
      currency: this._currency,
      kwh: this._kwh,
      totalCost: this._totalCost,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }

    if (this._endDateTime && this._endDateTime <= this._startDateTime) {
      throw new OcpiInvalidParametersException(
        'End date time must be after start date time',
      )
    }
  }

  start(): Session {
    if (this._status !== 'PENDING' && this._status !== 'RESERVED') {
      throw new OcpiGenericServerException(
        `Cannot start session from status: ${this._status}`,
      )
    }

    return new Session(
      this._id,
      this._startDateTime,
      this._kwh,
      this._cdrToken,
      this._authMethod,
      this._authorizationReference,
      this._locationId,
      this._evseUid,
      this._connectorId,
      this._meterId,
      this._currency,
      'ACTIVE',
      new Date(),
      this._endDateTime,
      this._chargingPeriods,
      this._totalCost,
      this._chargingPreferences,
    )
  }

  complete(endDateTime: Date, totalCost?: number): Session {
    if (this._status !== 'ACTIVE') {
      throw new OcpiGenericServerException(
        `Cannot complete session from status: ${this._status}`,
      )
    }

    if (endDateTime <= this._startDateTime) {
      throw new OcpiInvalidParametersException(
        'End date time must be after start date time',
      )
    }

    return new Session(
      this._id,
      this._startDateTime,
      this._kwh,
      this._cdrToken,
      this._authMethod,
      this._authorizationReference,
      this._locationId,
      this._evseUid,
      this._connectorId,
      this._meterId,
      this._currency,
      'COMPLETED',
      new Date(),
      endDateTime,
      this._chargingPeriods,
      totalCost || this._totalCost,
      this._chargingPreferences,
    )
  }

  updateEnergy(kwh: number): Session {
    if (kwh < 0) {
      throw new OcpiInvalidParametersException(
        'Energy consumption cannot be negative',
      )
    }

    return new Session(
      this._id,
      this._startDateTime,
      kwh,
      this._cdrToken,
      this._authMethod,
      this._authorizationReference,
      this._locationId,
      this._evseUid,
      this._connectorId,
      this._meterId,
      this._currency,
      this._status,
      new Date(),
      this._endDateTime,
      this._chargingPeriods,
      this._totalCost,
      this._chargingPreferences,
    )
  }

  addChargingPeriod(period: ChargingPeriod): Session {
    const currentPeriods = this._chargingPeriods || []

    return new Session(
      this._id,
      this._startDateTime,
      this._kwh,
      this._cdrToken,
      this._authMethod,
      this._authorizationReference,
      this._locationId,
      this._evseUid,
      this._connectorId,
      this._meterId,
      this._currency,
      this._status,
      new Date(),
      this._endDateTime,
      [...currentPeriods, period],
      this._totalCost,
      this._chargingPreferences,
    )
  }

  setChargingPreferences(preferences: ChargingPreferences): Session {
    if (this._status !== 'ACTIVE') {
      throw new OcpiGenericServerException(
        'Can only set charging preferences for active sessions',
      )
    }

    return new Session(
      this._id,
      this._startDateTime,
      this._kwh,
      this._cdrToken,
      this._authMethod,
      this._authorizationReference,
      this._locationId,
      this._evseUid,
      this._connectorId,
      this._meterId,
      this._currency,
      this._status,
      new Date(),
      this._endDateTime,
      this._chargingPeriods,
      this._totalCost,
      preferences,
    )
  }

  getDuration(): number {
    if (!this._endDateTime) {
      return Date.now() - this._startDateTime.getTime()
    }
    return this._endDateTime.getTime() - this._startDateTime.getTime()
  }

  getTotalEnergyFromPeriods(): number {
    if (!this._chargingPeriods) return 0
    return this._chargingPeriods.reduce(
      (total, period) => total + period.getEnergyConsumed(),
      0,
    )
  }

  isActive(): boolean {
    return this._status === 'ACTIVE'
  }

  isCompleted(): boolean {
    return this._status === 'COMPLETED'
  }

  equals(other: Session): boolean {
    return this._id.equals(other._id)
  }
}
