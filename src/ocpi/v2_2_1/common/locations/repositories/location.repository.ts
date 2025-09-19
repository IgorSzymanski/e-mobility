import type { Location } from '@/domain/locations/location.aggregate'
import type { EVSE } from '@/domain/locations/entities/evse'
import type { Connector } from '@/domain/locations/entities/connector'

export interface LocationFilter {
  readonly dateFrom?: Date
  readonly dateTo?: Date
  readonly countryCode?: string
  readonly partyId?: string
  readonly publish?: boolean
}

export interface PaginationOptions {
  readonly offset: number
  readonly limit?: number
}

export interface LocationListResult {
  readonly locations: ReadonlyArray<Location>
  readonly totalCount: number
  readonly hasMore: boolean
}

export interface LocationRepository {
  /**
   * Find locations with optional filtering and pagination
   * Used by CPO Sender interface for GET /locations
   */
  findLocations(
    filter?: LocationFilter,
    pagination?: PaginationOptions,
  ): Promise<LocationListResult>

  /**
   * Find a specific location by ID
   * Used for both CPO and EMP interfaces
   */
  findLocationById(
    countryCode: string,
    partyId: string,
    locationId: string,
  ): Promise<Location | null>

  /**
   * Find a specific EVSE within a location
   * Used for hierarchical object retrieval
   */
  findEvse(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
  ): Promise<EVSE | null>

  /**
   * Find a specific connector within an EVSE
   * Used for hierarchical object retrieval
   */
  findConnector(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    connectorId: string,
  ): Promise<Connector | null>

  /**
   * Save or update a location
   * Used by EMP Receiver interface for PUT operations
   */
  saveLocation(location: Location): Promise<Location>

  /**
   * Update a specific EVSE and propagate last_updated to parent Location
   * Used by EMP Receiver interface for EVSE-level updates
   */
  updateEvse(
    countryCode: string,
    partyId: string,
    locationId: string,
    evse: EVSE,
  ): Promise<Location>

  /**
   * Update a specific connector and propagate last_updated to parent EVSE and Location
   * Used by EMP Receiver interface for Connector-level updates
   */
  updateConnector(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    connector: Connector,
  ): Promise<Location>

  /**
   * Check if a location exists
   * Used for validation in EMP interface
   */
  locationExists(
    countryCode: string,
    partyId: string,
    locationId: string,
  ): Promise<boolean>

  /**
   * Get locations modified since a specific date
   * Used for synchronization scenarios
   */
  findLocationsModifiedSince(
    since: Date,
    pagination?: PaginationOptions,
  ): Promise<LocationListResult>

  /**
   * Get location statistics for a party
   * Used for monitoring and reporting
   */
  getLocationStats(
    countryCode: string,
    partyId: string,
  ): Promise<{
    totalLocations: number
    totalEvses: number
    totalConnectors: number
    publishedLocations: number
  }>
}
