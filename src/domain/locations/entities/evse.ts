import { z } from 'zod'
import { GeoLocation } from '../value-objects/geo-location'
import { Image } from '../value-objects/image'
import { Connector } from './connector'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

const EVSESchema = z.object({
  uid: z.string().min(1, 'EVSE UID cannot be empty').trim(),
  connectors: z.array(z.any()).min(1, 'EVSE must have at least one connector'),
  evseId: z.string().max(48, 'EVSE ID cannot exceed 48 characters').optional(),
})

export type EVSEStatus =
  | 'AVAILABLE'
  | 'BLOCKED'
  | 'CHARGING'
  | 'INOPERATIVE'
  | 'OUTOFORDER'
  | 'PLANNED'
  | 'REMOVED'
  | 'RESERVED'
  | 'UNKNOWN'

export type Capability =
  | 'CHARGING_PROFILE_CAPABLE'
  | 'CHARGING_PREFERENCES_CAPABLE'
  | 'CHIP_CARD_SUPPORT'
  | 'CONTACTLESS_CARD_SUPPORT'
  | 'CREDIT_CARD_PAYABLE'
  | 'DEBIT_CARD_PAYABLE'
  | 'PED_TERMINAL'
  | 'REMOTE_START_STOP_CAPABLE'
  | 'RESERVABLE'
  | 'RFID_READER'
  | 'START_SESSION_CONNECTOR_REQUIRED'
  | 'TOKEN_GROUP_CAPABLE'
  | 'UNLOCK_CAPABLE'

export type ParkingRestriction =
  | 'EV_ONLY'
  | 'PLUGGED'
  | 'DISABLED'
  | 'CUSTOMERS'
  | 'MOTORCYCLES'

export interface StatusSchedule {
  readonly periodBegin: Date
  readonly periodEnd?: Date
  readonly status: EVSEStatus
}

export interface DisplayText {
  readonly language: string
  readonly text: string
}

export class EVSE {
  constructor(
    private readonly _uid: string,
    private readonly _status: EVSEStatus,
    private readonly _connectors: ReadonlyArray<Connector>,
    private readonly _lastUpdated: Date,
    private readonly _evseId?: string,
    private readonly _statusSchedule?: ReadonlyArray<StatusSchedule>,
    private readonly _capabilities?: ReadonlyArray<Capability>,
    private readonly _floorLevel?: string,
    private readonly _coordinates?: GeoLocation,
    private readonly _physicalReference?: string,
    private readonly _directions?: ReadonlyArray<DisplayText>,
    private readonly _parkingRestrictions?: ReadonlyArray<ParkingRestriction>,
    private readonly _images?: ReadonlyArray<Image>,
  ) {
    this.validate()
  }

  get uid(): string {
    return this._uid
  }

  get evseId(): string | undefined {
    return this._evseId
  }

  get status(): EVSEStatus {
    return this._status
  }

  get statusSchedule(): ReadonlyArray<StatusSchedule> | undefined {
    return this._statusSchedule
  }

  get capabilities(): ReadonlyArray<Capability> | undefined {
    return this._capabilities
  }

  get connectors(): ReadonlyArray<Connector> {
    return this._connectors
  }

  get floorLevel(): string | undefined {
    return this._floorLevel
  }

  get coordinates(): GeoLocation | undefined {
    return this._coordinates
  }

  get physicalReference(): string | undefined {
    return this._physicalReference
  }

  get directions(): ReadonlyArray<DisplayText> | undefined {
    return this._directions
  }

  get parkingRestrictions(): ReadonlyArray<ParkingRestriction> | undefined {
    return this._parkingRestrictions
  }

  get images(): ReadonlyArray<Image> | undefined {
    return this._images
  }

  get lastUpdated(): Date {
    return this._lastUpdated
  }

  private validate(): void {
    const result = EVSESchema.safeParse({
      uid: this._uid,
      connectors: this._connectors,
      evseId: this._evseId,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  updateStatus(status: EVSEStatus): EVSE {
    return new EVSE(
      this._uid,
      status,
      this._connectors,
      new Date(),
      this._evseId,
      this._statusSchedule,
      this._capabilities,
      this._floorLevel,
      this._coordinates,
      this._physicalReference,
      this._directions,
      this._parkingRestrictions,
      this._images,
    )
  }

  updateConnectors(connectors: ReadonlyArray<Connector>): EVSE {
    return new EVSE(
      this._uid,
      this._status,
      connectors,
      new Date(),
      this._evseId,
      this._statusSchedule,
      this._capabilities,
      this._floorLevel,
      this._coordinates,
      this._physicalReference,
      this._directions,
      this._parkingRestrictions,
      this._images,
    )
  }

  addCapability(capability: Capability): EVSE {
    const currentCapabilities = this._capabilities || []
    if (currentCapabilities.includes(capability)) {
      return this
    }

    return new EVSE(
      this._uid,
      this._status,
      this._connectors,
      new Date(),
      this._evseId,
      this._statusSchedule,
      [...currentCapabilities, capability],
      this._floorLevel,
      this._coordinates,
      this._physicalReference,
      this._directions,
      this._parkingRestrictions,
      this._images,
    )
  }

  removeCapability(capability: Capability): EVSE {
    const currentCapabilities = this._capabilities || []
    const filteredCapabilities = currentCapabilities.filter(
      (c) => c !== capability,
    )

    return new EVSE(
      this._uid,
      this._status,
      this._connectors,
      new Date(),
      this._evseId,
      this._statusSchedule,
      filteredCapabilities,
      this._floorLevel,
      this._coordinates,
      this._physicalReference,
      this._directions,
      this._parkingRestrictions,
      this._images,
    )
  }

  isAvailable(): boolean {
    return this._status === 'AVAILABLE'
  }

  isOperational(): boolean {
    return !['INOPERATIVE', 'OUTOFORDER', 'REMOVED'].includes(this._status)
  }

  equals(other: EVSE): boolean {
    return this._uid === other._uid
  }
}
