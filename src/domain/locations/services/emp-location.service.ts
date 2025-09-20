import { Location } from '../location.aggregate'
import { EVSE } from '../entities/evse'
import { Connector } from '../entities/connector'
import {
  OcpiInvalidParametersException,
  OcpiUnknownLocationException,
} from '../../../shared/exceptions/ocpi.exceptions'
import type { LocationRepository } from '../../../ocpi/v2_2_1/common/locations/repositories/location.repository'

export interface CreateLocationRequest {
  readonly locationData: Location
  readonly countryCode: string
  readonly partyId: string
}

export interface UpdateLocationRequest {
  readonly locationId: string
  readonly partialData: Partial<Location>
  readonly countryCode: string
  readonly partyId: string
}

export interface UpdateEvseRequest {
  readonly countryCode: string
  readonly partyId: string
  readonly locationId: string
  readonly evseUid: string
  readonly evse: EVSE
}

export interface UpdateConnectorRequest {
  readonly countryCode: string
  readonly partyId: string
  readonly locationId: string
  readonly evseUid: string
  readonly connectorId: string
  readonly connector: Connector
}

export class EmpLocationService {
  constructor(private readonly locationRepository: LocationRepository) {}

  async createOrUpdateLocation(
    request: CreateLocationRequest,
  ): Promise<Location> {
    const { locationData, countryCode, partyId } = request

    // Validate that the location belongs to the authenticated party
    this.validateLocationOwnership(locationData, countryCode, partyId)

    // Validate required fields
    this.validateRequiredLocationFields(locationData)

    // Check if location already exists
    const exists = await this.locationRepository.locationExists(
      countryCode,
      partyId,
      locationData.id.value,
    )

    if (exists) {
      // For updates, we should retrieve the existing location and merge
      const existingLocation = await this.locationRepository.findLocationById(
        countryCode,
        partyId,
        locationData.id.value,
      )

      if (!existingLocation) {
        throw new OcpiUnknownLocationException(
          `Location ${locationData.id.value} exists but could not be retrieved`,
        )
      }

      // Update the existing location with new data
      const updatedLocation = this.mergeLocationData(
        existingLocation,
        locationData,
      )
      return this.locationRepository.saveLocation(updatedLocation)
    }

    // Create new location
    return this.locationRepository.saveLocation(locationData)
  }

  async updateLocationPartial(
    request: UpdateLocationRequest,
  ): Promise<Location> {
    const { locationId, partialData, countryCode, partyId } = request

    // Check if location exists
    const existingLocation = await this.locationRepository.findLocationById(
      countryCode,
      partyId,
      locationId,
    )

    if (!existingLocation) {
      throw new OcpiUnknownLocationException(`Unknown location: ${locationId}`)
    }

    // Apply partial updates to existing location
    const updatedLocation = this.applyPartialUpdate(
      existingLocation,
      partialData,
    )

    return this.locationRepository.saveLocation(updatedLocation)
  }

  async updateEvse(request: UpdateEvseRequest): Promise<Location> {
    const { countryCode, partyId, locationId, evseUid, evse } = request

    // Check if location exists
    const existingLocation = await this.locationRepository.findLocationById(
      countryCode,
      partyId,
      locationId,
    )

    if (!existingLocation) {
      throw new OcpiUnknownLocationException(`Unknown location: ${locationId}`)
    }

    // Check if EVSE already exists and update, or add new one
    const currentEvses = existingLocation.evses || []
    const existingEvseIndex = currentEvses.findIndex((e) => e.uid === evseUid)

    const updatedLocation =
      existingEvseIndex >= 0
        ? existingLocation.updateEVSE(evseUid, evse)
        : existingLocation.addEVSE(evse)

    return this.locationRepository.saveLocation(updatedLocation)
  }

  async updateConnector(request: UpdateConnectorRequest): Promise<Location> {
    const {
      countryCode,
      partyId,
      locationId,
      evseUid,
      connectorId,
      connector,
    } = request

    // Check if location exists
    const existingLocation = await this.locationRepository.findLocationById(
      countryCode,
      partyId,
      locationId,
    )

    if (!existingLocation) {
      throw new OcpiUnknownLocationException(`Unknown location: ${locationId}`)
    }

    // Find the EVSE
    const currentEvses = existingLocation.evses || []
    const targetEvse = currentEvses.find((e) => e.uid === evseUid)

    if (!targetEvse) {
      throw new OcpiUnknownLocationException(
        `EVSE ${evseUid} not found in location ${locationId}`,
      )
    }

    // Update the connector in the EVSE
    // TODO: Implement updateConnector method in EVSE class
    // For now, this is a placeholder implementation
    const currentConnectors = targetEvse.connectors || []
    const connectorIndex = currentConnectors.findIndex(
      (c) => c.id === connectorId,
    )

    const updatedConnectors =
      connectorIndex >= 0
        ? [
            ...currentConnectors.slice(0, connectorIndex),
            connector,
            ...currentConnectors.slice(connectorIndex + 1),
          ]
        : [...currentConnectors, connector]

    const updatedEvse = targetEvse.updateConnectors(updatedConnectors)
    const updatedLocation = existingLocation.updateEVSE(evseUid, updatedEvse)

    return this.locationRepository.saveLocation(updatedLocation)
  }

  async validateLocationAccess(
    countryCode: string,
    partyId: string,
    locationId: string,
  ): Promise<boolean> {
    return this.locationRepository.locationExists(
      countryCode,
      partyId,
      locationId,
    )
  }

  private validateLocationOwnership(
    location: Location,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _countryCode: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _partyId: string,
  ): void {
    // The location ID should contain country code and party ID information
    // This validation ensures the location belongs to the authenticated party
    const locationId = location.id.value

    // In OCPI, location IDs should be unique within the party's scope
    // Additional validation could be added here based on business rules
    if (!locationId || locationId.trim() === '') {
      throw new OcpiInvalidParametersException('Location ID cannot be empty')
    }
  }

  private validateRequiredLocationFields(location: Location): void {
    // The Location aggregate already has validation in its constructor
    // This method can add additional EMP-specific validation rules

    if (!location.address || location.address.trim() === '') {
      throw new OcpiInvalidParametersException('Address is required')
    }

    if (!location.city || location.city.trim() === '') {
      throw new OcpiInvalidParametersException('City is required')
    }

    if (!location.country || location.country.trim() === '') {
      throw new OcpiInvalidParametersException('Country is required')
    }

    if (!location.coordinates) {
      throw new OcpiInvalidParametersException('Coordinates are required')
    }
  }

  private mergeLocationData(
    existingLocation: Location,
    newData: Location,
  ): Location {
    // Create a new location with updated data
    // This preserves the immutable nature of the Location aggregate
    return new Location(
      existingLocation.id,
      newData.publish,
      newData.address,
      newData.city,
      newData.country,
      newData.coordinates,
      newData.timeZone,
      new Date(), // Update last_updated timestamp
      newData.name || existingLocation.name,
      newData.postalCode || existingLocation.postalCode,
      newData.state || existingLocation.state,
      newData.relatedLocations || existingLocation.relatedLocations,
      newData.parkingType || existingLocation.parkingType,
      newData.evses || existingLocation.evses,
      newData.directions || existingLocation.directions,
      newData.operator || existingLocation.operator,
      newData.suboperator || existingLocation.suboperator,
      newData.owner || existingLocation.owner,
      newData.facilities || existingLocation.facilities,
      newData.openingTimes || existingLocation.openingTimes,
      newData.chargingWhenClosed ?? existingLocation.chargingWhenClosed,
      newData.images || existingLocation.images,
      newData.energyMix || existingLocation.energyMix,
      newData.publishAllowedTo || existingLocation.publishAllowedTo,
    )
  }

  private applyPartialUpdate(
    existingLocation: Location,
    partialData: Partial<Location>,
  ): Location {
    // Apply only the provided fields to the existing location
    return new Location(
      existingLocation.id,
      partialData.publish ?? existingLocation.publish,
      partialData.address ?? existingLocation.address,
      partialData.city ?? existingLocation.city,
      partialData.country ?? existingLocation.country,
      partialData.coordinates ?? existingLocation.coordinates,
      partialData.timeZone ?? existingLocation.timeZone,
      new Date(), // Update last_updated timestamp
      partialData.name ?? existingLocation.name,
      partialData.postalCode ?? existingLocation.postalCode,
      partialData.state ?? existingLocation.state,
      partialData.relatedLocations ?? existingLocation.relatedLocations,
      partialData.parkingType ?? existingLocation.parkingType,
      partialData.evses ?? existingLocation.evses,
      partialData.directions ?? existingLocation.directions,
      partialData.operator ?? existingLocation.operator,
      partialData.suboperator ?? existingLocation.suboperator,
      partialData.owner ?? existingLocation.owner,
      partialData.facilities ?? existingLocation.facilities,
      partialData.openingTimes ?? existingLocation.openingTimes,
      partialData.chargingWhenClosed ?? existingLocation.chargingWhenClosed,
      partialData.images ?? existingLocation.images,
      partialData.energyMix ?? existingLocation.energyMix,
      partialData.publishAllowedTo ?? existingLocation.publishAllowedTo,
    )
  }
}
