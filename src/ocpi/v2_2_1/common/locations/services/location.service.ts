import { Injectable, Inject } from '@nestjs/common'
import type { LocationRepository } from '../repositories/location.repository'
import type { Location } from '@/domain/locations/location.aggregate'
import type { EVSE } from '@/domain/locations/entities/evse'
import type { Connector } from '@/domain/locations/entities/connector'
import {
  LocationMapper,
  type LocationDto,
  type EvseDto,
  type ConnectorDto,
} from '../dto/location.dto'
import type {
  LocationListQueryDto,
  LocationObjectQueryDto,
} from '../dto/location-query.dto'
import {
  createOcpiSuccessResponse,
  type OcpiResponse,
} from '../../ocpi-envelope'
import {
  OcpiUnknownLocationException,
  OcpiInvalidParametersException,
} from '@/shared/exceptions/ocpi.exceptions'

export interface LocationListResponse {
  readonly locations: ReadonlyArray<LocationDto>
  readonly totalCount: number
  readonly hasMore: boolean
}

@Injectable()
export class LocationService {
  constructor(
    @Inject('LocationRepository')
    private readonly locationRepository: LocationRepository,
  ) {}

  async findLocations(
    query: LocationListQueryDto,
    countryCode: string,
    partyId: string,
  ): Promise<OcpiResponse<LocationDto[]>> {
    const filter: Record<string, unknown> = {}

    if (query.date_from) {
      filter.dateFrom = new Date(query.date_from)
    }
    if (query.date_to) {
      filter.dateTo = new Date(query.date_to)
    }

    const pagination = {
      offset: query.offset,
      limit: query.limit,
    }

    const result = await this.locationRepository.findLocations(
      filter,
      pagination,
    )

    const locationDtos = result.locations.map((location) =>
      LocationMapper.fromDomain(location, countryCode, partyId),
    )

    return createOcpiSuccessResponse(locationDtos)
  }

  async findLocationById(
    params: LocationObjectQueryDto,
    countryCode: string,
    partyId: string,
  ): Promise<OcpiResponse<LocationDto>> {
    const location = await this.locationRepository.findLocationById(
      countryCode,
      partyId,
      params.location_id,
    )

    if (!location) {
      throw new OcpiUnknownLocationException(
        `Location ${params.location_id} not found`,
      )
    }

    const locationDto = LocationMapper.fromDomain(
      location,
      countryCode,
      partyId,
    )
    return createOcpiSuccessResponse(locationDto)
  }

  async findEvse(
    params: LocationObjectQueryDto & { evse_uid: string },
    countryCode: string,
    partyId: string,
  ): Promise<OcpiResponse<EvseDto>> {
    if (!params.evse_uid) {
      throw new OcpiInvalidParametersException('EVSE UID is required')
    }

    const evse = await this.locationRepository.findEvse(
      countryCode,
      partyId,
      params.location_id,
      params.evse_uid,
    )

    if (!evse) {
      throw new OcpiUnknownLocationException(
        `EVSE ${params.evse_uid} not found in location ${params.location_id}`,
      )
    }

    // Map EVSE to DTO (would need EVSE mapper implementation)
    // For now, throw not implemented
    throw new Error('EVSE mapping not implemented yet')
  }

  async findConnector(
    params: LocationObjectQueryDto & { evse_uid: string; connector_id: string },
    countryCode: string,
    partyId: string,
  ): Promise<OcpiResponse<ConnectorDto>> {
    if (!params.evse_uid || !params.connector_id) {
      throw new OcpiInvalidParametersException(
        'EVSE UID and Connector ID are required',
      )
    }

    const connector = await this.locationRepository.findConnector(
      countryCode,
      partyId,
      params.location_id,
      params.evse_uid,
      params.connector_id,
    )

    if (!connector) {
      throw new OcpiUnknownLocationException(
        `Connector ${params.connector_id} not found in EVSE ${params.evse_uid}`,
      )
    }

    // Map Connector to DTO (would need Connector mapper implementation)
    // For now, throw not implemented
    throw new Error('Connector mapping not implemented yet')
  }

  async saveLocation(location: Location): Promise<Location> {
    return this.locationRepository.saveLocation(location)
  }

  async updateEvse(
    countryCode: string,
    partyId: string,
    locationId: string,
    evse: EVSE,
  ): Promise<Location> {
    return this.locationRepository.updateEvse(
      countryCode,
      partyId,
      locationId,
      evse,
    )
  }

  async updateConnector(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    connector: Connector,
  ): Promise<Location> {
    return this.locationRepository.updateConnector(
      countryCode,
      partyId,
      locationId,
      evseUid,
      connector,
    )
  }

  async locationExists(
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

  async getLocationStats(
    countryCode: string,
    partyId: string,
  ): Promise<{
    totalLocations: number
    totalEvses: number
    totalConnectors: number
    publishedLocations: number
  }> {
    return this.locationRepository.getLocationStats(countryCode, partyId)
  }
}
