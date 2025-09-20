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
    this.validateRequiredLocationFields()

    // Check if location already exists
    const exists = await this.locationRepository.locationExists(
      countryCode,
      partyId,
      locationData.id.id,
    )

    if (exists) {
      // For updates, we should retrieve the existing location and merge
      const existingLocation = await this.locationRepository.findLocationById(
        countryCode,
        partyId,
        locationData.id.id,
      )

      if (!existingLocation) {
        throw new OcpiUnknownLocationException(
          `Location ${locationData.id.id} exists but could not be retrieved`,
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

    // Update the connector in the EVSE using immutable operations
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
    countryCode: string,
    partyId: string,
  ): void {
    // CRITICAL SECURITY: Validate that the location belongs to the authenticated party
    // This prevents cross-party data tampering attacks

    if (location.id.countryCode !== countryCode) {
      throw new OcpiInvalidParametersException(
        `Location country code '${location.id.countryCode}' does not match authenticated party country code '${countryCode}'`,
      )
    }

    if (location.id.partyId !== partyId) {
      throw new OcpiInvalidParametersException(
        `Location party ID '${location.id.partyId}' does not match authenticated party ID '${partyId}'`,
      )
    }

    // Basic validation that location ID is not empty
    if (!location.id.id || location.id.id.trim() === '') {
      throw new OcpiInvalidParametersException('Location ID cannot be empty')
    }
  }

  private validateRequiredLocationFields(): void {
    // The Location aggregate already validates all required fields using Zod in its constructor
    // The validation happens automatically when the Location is instantiated, so no additional
    // validation is needed here. The Location constructor will throw OcpiInvalidParametersException
    // if any required fields are missing or invalid.
    // This method is kept for potential future EMP-specific business rules
    // that might be different from the core domain validation
    // All basic validation (address, city, country, coordinates, timezone) is handled by
    // the Location aggregate's internal Zod schema validation
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
