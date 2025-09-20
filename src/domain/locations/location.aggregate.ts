import { z } from 'zod'
import { LocationId } from './value-objects/location-id'
import { GeoLocation } from './value-objects/geo-location'
import { BusinessDetails } from './value-objects/business-details'
import { Image } from './value-objects/image'
import { EVSE } from './entities/evse'
import {
  OcpiInvalidParametersException,
  OcpiUnknownLocationException,
} from '../../shared/exceptions/ocpi.exceptions'

const LocationSchema = z.object({
  address: z.string().min(1, 'Address cannot be empty').trim(),
  city: z.string().min(1, 'City cannot be empty').trim(),
  country: z.string().min(1, 'Country cannot be empty').trim(),
  timeZone: z.string().min(1, 'Time zone cannot be empty').trim(),
})

export type LocationType =
  | 'ON_STREET'
  | 'PARKING_GARAGE'
  | 'UNDERGROUND_GARAGE'
  | 'PARKING_LOT'
  | 'OTHER'
  | 'UNKNOWN'

export type Facility =
  | 'HOTEL'
  | 'RESTAURANT'
  | 'CAFE'
  | 'MALL'
  | 'SUPERMARKET'
  | 'SPORT'
  | 'RECREATION_AREA'
  | 'NATURE'
  | 'MUSEUM'
  | 'BIKE_SHARING'
  | 'BUS_STOP'
  | 'TAXI_STAND'
  | 'TRAM_STOP'
  | 'METRO_STATION'
  | 'TRAIN_STATION'
  | 'AIRPORT'
  | 'PARKING_LOT'
  | 'CARPOOL_PARKING'
  | 'FUEL_STATION'
  | 'WIFI'

export type ParkingType =
  | 'ALONG_MOTORWAY'
  | 'PARKING_GARAGE'
  | 'PARKING_LOT'
  | 'ON_DRIVEWAY'
  | 'ON_STREET'
  | 'UNDERGROUND_GARAGE'

export interface AdditionalGeoLocation {
  readonly coordinates: GeoLocation
  readonly name?: DisplayText
}

export interface DisplayText {
  readonly language: string
  readonly text: string
}

export interface RegularHours {
  readonly weekday: number // 1-7 (Monday=1)
  readonly periodBegin: string // HH:MM
  readonly periodEnd: string // HH:MM
}

export interface ExceptionalPeriod {
  readonly periodBegin: Date
  readonly periodEnd: Date
}

export interface Hours {
  readonly twentyfourseven: boolean
  readonly regularHours?: ReadonlyArray<RegularHours>
  readonly exceptionalOpenings?: ReadonlyArray<ExceptionalPeriod>
  readonly exceptionalClosings?: ReadonlyArray<ExceptionalPeriod>
}

export interface EnergyMix {
  readonly isGreenEnergy: boolean
  readonly energySources?: ReadonlyArray<EnergySource>
  readonly environImpact?: ReadonlyArray<EnvironmentalImpact>
  readonly supplierName?: string
  readonly energyProductName?: string
}

export interface EnergySource {
  readonly source: EnergySourceCategory
  readonly percentage: number
}

export type EnergySourceCategory =
  | 'NUCLEAR'
  | 'GENERAL_FOSSIL'
  | 'COAL'
  | 'GAS'
  | 'GENERAL_GREEN'
  | 'SOLAR'
  | 'WIND'
  | 'WATER'

export interface EnvironmentalImpact {
  readonly category: EnvironmentalImpactCategory
  readonly amount: number
}

export type EnvironmentalImpactCategory = 'NUCLEAR_WASTE' | 'CARBON_DIOXIDE'

export interface PublishTokenType {
  readonly uid?: string
  readonly type?: TokenType
  readonly visualNumber?: string
  readonly issuer?: string
  readonly groupId?: string
}

export type TokenType = 'AD_HOC_USER' | 'APP_USER' | 'OTHER' | 'RFID'

export class Location {
  constructor(
    private readonly _id: LocationId,
    private readonly _publish: boolean,
    private readonly _address: string,
    private readonly _city: string,
    private readonly _country: string,
    private readonly _coordinates: GeoLocation,
    private readonly _timeZone: string,
    private readonly _lastUpdated: Date,
    private readonly _name?: string,
    private readonly _postalCode?: string,
    private readonly _state?: string,
    private readonly _relatedLocations?: ReadonlyArray<AdditionalGeoLocation>,
    private readonly _parkingType?: ParkingType,
    private readonly _evses?: ReadonlyArray<EVSE>,
    private readonly _directions?: ReadonlyArray<DisplayText>,
    private readonly _operator?: BusinessDetails,
    private readonly _suboperator?: BusinessDetails,
    private readonly _owner?: BusinessDetails,
    private readonly _facilities?: ReadonlyArray<Facility>,
    private readonly _openingTimes?: Hours,
    private readonly _chargingWhenClosed?: boolean,
    private readonly _images?: ReadonlyArray<Image>,
    private readonly _energyMix?: EnergyMix,
    private readonly _publishAllowedTo?: ReadonlyArray<PublishTokenType>,
  ) {
    this.validate()
  }

  get id(): LocationId {
    return this._id
  }

  get publish(): boolean {
    return this._publish
  }

  get publishAllowedTo(): ReadonlyArray<PublishTokenType> | undefined {
    return this._publishAllowedTo
  }

  get name(): string | undefined {
    return this._name
  }

  get address(): string {
    return this._address
  }

  get city(): string {
    return this._city
  }

  get postalCode(): string | undefined {
    return this._postalCode
  }

  get state(): string | undefined {
    return this._state
  }

  get country(): string {
    return this._country
  }

  get coordinates(): GeoLocation {
    return this._coordinates
  }

  get relatedLocations(): ReadonlyArray<AdditionalGeoLocation> | undefined {
    return this._relatedLocations
  }

  get parkingType(): ParkingType | undefined {
    return this._parkingType
  }

  get evses(): ReadonlyArray<EVSE> | undefined {
    return this._evses
  }

  get directions(): ReadonlyArray<DisplayText> | undefined {
    return this._directions
  }

  get operator(): BusinessDetails | undefined {
    return this._operator
  }

  get suboperator(): BusinessDetails | undefined {
    return this._suboperator
  }

  get owner(): BusinessDetails | undefined {
    return this._owner
  }

  get facilities(): ReadonlyArray<Facility> | undefined {
    return this._facilities
  }

  get timeZone(): string {
    return this._timeZone
  }

  get openingTimes(): Hours | undefined {
    return this._openingTimes
  }

  get chargingWhenClosed(): boolean | undefined {
    return this._chargingWhenClosed
  }

  get images(): ReadonlyArray<Image> | undefined {
    return this._images
  }

  get energyMix(): EnergyMix | undefined {
    return this._energyMix
  }

  get lastUpdated(): Date {
    return this._lastUpdated
  }

  private validate(): void {
    const result = LocationSchema.safeParse({
      address: this._address,
      city: this._city,
      country: this._country,
      timeZone: this._timeZone,
    })

    if (!result.success) {
      const firstError = result.error.issues[0]
      throw new OcpiInvalidParametersException(firstError.message)
    }
  }

  updatePublishStatus(publish: boolean): Location {
    return new Location(
      this._id,
      publish,
      this._address,
      this._city,
      this._country,
      this._coordinates,
      this._timeZone,
      new Date(),
      this._name,
      this._postalCode,
      this._state,
      this._relatedLocations,
      this._parkingType,
      this._evses,
      this._directions,
      this._operator,
      this._suboperator,
      this._owner,
      this._facilities,
      this._openingTimes,
      this._chargingWhenClosed,
      this._images,
      this._energyMix,
      this._publishAllowedTo,
    )
  }

  addEVSE(evse: EVSE): Location {
    const currentEvses = this._evses || []
    const existingEvse = currentEvses.find((e) => e.equals(evse))

    if (existingEvse) {
      throw new OcpiInvalidParametersException(
        `EVSE with UID ${evse.uid} already exists`,
      )
    }

    return new Location(
      this._id,
      this._publish,
      this._address,
      this._city,
      this._country,
      this._coordinates,
      this._timeZone,
      new Date(),
      this._name,
      this._postalCode,
      this._state,
      this._relatedLocations,
      this._parkingType,
      [...currentEvses, evse],
      this._directions,
      this._operator,
      this._suboperator,
      this._owner,
      this._facilities,
      this._openingTimes,
      this._chargingWhenClosed,
      this._images,
      this._energyMix,
      this._publishAllowedTo,
    )
  }

  updateEVSE(evseUid: string, updatedEvse: EVSE): Location {
    const currentEvses = this._evses || []
    const evseIndex = currentEvses.findIndex((e) => e.uid === evseUid)

    if (evseIndex === -1) {
      throw new OcpiUnknownLocationException(
        `EVSE with UID ${evseUid} not found`,
      )
    }

    const updatedEvses = [
      ...currentEvses.slice(0, evseIndex),
      updatedEvse,
      ...currentEvses.slice(evseIndex + 1),
    ]

    return new Location(
      this._id,
      this._publish,
      this._address,
      this._city,
      this._country,
      this._coordinates,
      this._timeZone,
      new Date(),
      this._name,
      this._postalCode,
      this._state,
      this._relatedLocations,
      this._parkingType,
      updatedEvses,
      this._directions,
      this._operator,
      this._suboperator,
      this._owner,
      this._facilities,
      this._openingTimes,
      this._chargingWhenClosed,
      this._images,
      this._energyMix,
      this._publishAllowedTo,
    )
  }

  removeEVSE(evseUid: string): Location {
    const currentEvses = this._evses || []
    const filteredEvses = currentEvses.filter((e) => e.uid !== evseUid)

    return new Location(
      this._id,
      this._publish,
      this._address,
      this._city,
      this._country,
      this._coordinates,
      this._timeZone,
      new Date(),
      this._name,
      this._postalCode,
      this._state,
      this._relatedLocations,
      this._parkingType,
      filteredEvses,
      this._directions,
      this._operator,
      this._suboperator,
      this._owner,
      this._facilities,
      this._openingTimes,
      this._chargingWhenClosed,
      this._images,
      this._energyMix,
      this._publishAllowedTo,
    )
  }

  getTotalConnectors(): number {
    if (!this._evses) return 0
    return this._evses.reduce(
      (total, evse) => total + evse.connectors.length,
      0,
    )
  }

  getAvailableConnectors(): number {
    if (!this._evses) return 0
    return this._evses
      .filter((evse) => evse.isAvailable())
      .reduce((total, evse) => total + evse.connectors.length, 0)
  }

  hasOperationalEVSEs(): boolean {
    if (!this._evses) return false
    return this._evses.some((evse) => evse.isOperational())
  }

  equals(other: Location): boolean {
    return this._id.equals(other._id)
  }
}
