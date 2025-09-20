import type { PrismaClient, OcpiLocation, Prisma } from '@prisma/client'
import type {
  LocationRepository,
  LocationFilter,
  PaginationOptions,
  LocationListResult,
} from './location.repository'
import type { Location } from '@/domain/locations/location.aggregate'
import type { EVSE } from '@/domain/locations/entities/evse'
import type { Connector } from '@/domain/locations/entities/connector'
import { LocationId } from '@/domain/locations/value-objects/location-id'
import { GeoLocation } from '@/domain/locations/value-objects/geo-location'
import { Location as LocationDomain } from '@/domain/locations/location.aggregate'
import { BusinessDetails } from '@/domain/locations/value-objects/business-details'
import { Image } from '@/domain/locations/value-objects/image'
import { OcpiContextService } from '@/ocpi/common/services/ocpi-context.service'
import { Logger } from '@nestjs/common'

export class LocationPrismaRepository implements LocationRepository {
  private readonly logger = new Logger(LocationPrismaRepository.name)

  constructor(
    private readonly prisma: PrismaClient,
    private readonly contextService: OcpiContextService,
  ) {}

  /**
   * Build base where clause with automatic party scoping
   * All queries are automatically scoped to the authenticated party
   */
  private buildPartyWhereClause(
    additionalFilter?: Partial<Prisma.OcpiLocationWhereInput>,
  ): Prisma.OcpiLocationWhereInput {
    const partyFilter = this.contextService.getPartyFilter()

    this.logger.debug(
      `Scoping location query to party: ${partyFilter.countryCode}*${partyFilter.partyId}`,
    )

    return {
      countryCode: partyFilter.countryCode,
      partyId: partyFilter.partyId,
      ...additionalFilter,
    }
  }

  async findLocations(
    filter?: LocationFilter,
    pagination?: PaginationOptions,
  ): Promise<LocationListResult> {
    const additionalFilter: Partial<Prisma.OcpiLocationWhereInput> = {}

    if (filter?.publish !== undefined) {
      additionalFilter.publish = filter.publish
    }

    if (filter?.dateFrom || filter?.dateTo) {
      additionalFilter.lastUpdated = {}
      if (filter.dateFrom) {
        additionalFilter.lastUpdated.gte = filter.dateFrom
      }
      if (filter.dateTo) {
        additionalFilter.lastUpdated.lt = filter.dateTo
      }
    }

    // Use party-scoped where clause
    const where = this.buildPartyWhereClause(additionalFilter)

    const [locations, totalCount] = await Promise.all([
      this.prisma.ocpiLocation.findMany({
        where,
        include: {
          evses: {
            include: {
              connectors: true,
            },
          },
        },
        skip: pagination?.offset || 0,
        take: pagination?.limit,
        orderBy: { lastUpdated: 'desc' },
      }),
      this.prisma.ocpiLocation.count({ where }),
    ])

    const domainLocations = locations.map((location) =>
      this.mapPrismaToDomain(location),
    )
    const hasMore = pagination?.limit
      ? (pagination.offset || 0) + locations.length < totalCount
      : false

    return {
      locations: domainLocations,
      totalCount,
      hasMore,
    }
  }

  async findLocationById(
    countryCode: string,
    partyId: string,
    locationId: string,
  ): Promise<Location | null> {
    // Validate that requested party matches authenticated party
    this.contextService.validatePartyAccess(countryCode, partyId)

    const where = this.buildPartyWhereClause({ locationId })

    const location = await this.prisma.ocpiLocation.findFirst({
      where,
      include: {
        evses: {
          include: {
            connectors: true,
          },
        },
      },
    })

    return location ? this.mapPrismaToDomain(location) : null
  }

  async findEvse(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
  ): Promise<EVSE | null> {
    // Validate party access
    this.contextService.validatePartyAccess(countryCode, partyId)

    const location = await this.findLocationById(
      countryCode,
      partyId,
      locationId,
    )
    if (!location || !location.evses) return null

    return location.evses.find((evse) => evse.uid === evseUid) || null
  }

  async findConnector(
    countryCode: string,
    partyId: string,
    locationId: string,
    evseUid: string,
    connectorId: string,
  ): Promise<Connector | null> {
    // Validate party access
    this.contextService.validatePartyAccess(countryCode, partyId)

    const evse = await this.findEvse(countryCode, partyId, locationId, evseUid)
    if (!evse) return null

    return (
      evse.connectors.find((connector) => connector.id === connectorId) || null
    )
  }

  async saveLocation(location: Location): Promise<Location> {
    // Validate that the location belongs to the authenticated party
    this.contextService.validatePartyAccess(
      location.id.countryCode,
      location.id.partyId,
    )

    const locationData = this.mapDomainToPrisma(location)

    // Check if location already exists using party-scoped query
    const where = this.buildPartyWhereClause({ locationId: location.id.id })
    const existing = await this.prisma.ocpiLocation.findFirst({ where })

    if (existing) {
      // Update existing location
      const updated = await this.prisma.ocpiLocation.update({
        where: {
          uq_location: {
            countryCode: location.id.countryCode,
            partyId: location.id.partyId,
            locationId: location.id.id,
          },
        },
        data: locationData,
        include: {
          evses: {
            include: {
              connectors: true,
            },
          },
        },
      })
      return this.mapPrismaToDomain(updated)
    } else {
      // Create new location
      const created = await this.prisma.ocpiLocation.create({
        data: locationData,
        include: {
          evses: {
            include: {
              connectors: true,
            },
          },
        },
      })
      return this.mapPrismaToDomain(created)
    }
  }

  async updateEvse(
    countryCode: string,
    partyId: string,
    locationId: string,
    evse: EVSE,
  ): Promise<Location> {
    // Validate party access
    this.contextService.validatePartyAccess(countryCode, partyId)

    // This would require more complex implementation with nested updates
    // For now, we'll get the location, update it in memory, and save it back
    const location = await this.findLocationById(
      countryCode,
      partyId,
      locationId,
    )
    if (!location) {
      throw new Error(
        `Location not found: ${countryCode}*${partyId}*${locationId}`,
      )
    }

    const updatedLocation = location.updateEVSE(evse.uid, evse)
    return this.saveLocation(updatedLocation)
  }

  async updateConnector(
    countryCode: string,
    partyId: string,
    locationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _evseUid: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _connector: Connector,
  ): Promise<Location> {
    // Validate party access
    this.contextService.validatePartyAccess(countryCode, partyId)

    // Similar to updateEvse, would require complex nested updates
    // For this implementation, we'll use the domain model approach
    const location = await this.findLocationById(
      countryCode,
      partyId,
      locationId,
    )
    if (!location) {
      throw new Error(
        `Location not found: ${countryCode}*${partyId}*${locationId}`,
      )
    }

    // This would require implementing connector updates in the domain model
    // For now, return the location as-is
    return location
  }

  async locationExists(
    countryCode: string,
    partyId: string,
    locationId: string,
  ): Promise<boolean> {
    // Validate party access
    this.contextService.validatePartyAccess(countryCode, partyId)

    const where = this.buildPartyWhereClause({ locationId })
    const count = await this.prisma.ocpiLocation.count({ where })
    return count > 0
  }

  async findLocationsModifiedSince(
    since: Date,
    pagination?: PaginationOptions,
  ): Promise<LocationListResult> {
    return this.findLocations({ dateFrom: since }, pagination)
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
    // Validate party access
    this.contextService.validatePartyAccess(countryCode, partyId)

    const partyFilter = this.contextService.getPartyFilter()

    const [totalLocations, publishedLocations, totalEvses, totalConnectors] =
      await Promise.all([
        this.prisma.ocpiLocation.count({
          where: partyFilter,
        }),
        this.prisma.ocpiLocation.count({
          where: { ...partyFilter, publish: true },
        }),
        this.prisma.ocpiEvse.count({
          where: {
            location: partyFilter,
          },
        }),
        this.prisma.ocpiConnector.count({
          where: {
            evse: {
              location: partyFilter,
            },
          },
        }),
      ])

    return {
      totalLocations,
      totalEvses,
      totalConnectors,
      publishedLocations,
    }
  }

  private mapPrismaToDomain(
    prismaLocation: OcpiLocation & {
      evses?: Array<{
        id: string
        uid: string
        connectors?: Array<{ id: string; connectorId: string }>
      }>
    },
  ): Location {
    const locationId = new LocationId(
      prismaLocation.countryCode,
      prismaLocation.partyId,
      prismaLocation.locationId,
    )

    const coordinates = new GeoLocation(
      (
        prismaLocation.coordinates as { latitude: string; longitude: string }
      ).latitude,
      (
        prismaLocation.coordinates as { latitude: string; longitude: string }
      ).longitude,
    )

    // Map business details if they exist
    const operator = prismaLocation.operator
      ? this.mapBusinessDetailsFromJson(prismaLocation.operator)
      : undefined

    const suboperator = prismaLocation.suboperator
      ? this.mapBusinessDetailsFromJson(prismaLocation.suboperator)
      : undefined

    const owner = prismaLocation.owner
      ? this.mapBusinessDetailsFromJson(prismaLocation.owner)
      : undefined

    // Map images if they exist
    const images = prismaLocation.images
      ? this.mapImagesFromJson(prismaLocation.images)
      : undefined

    return new LocationDomain(
      locationId,
      prismaLocation.publish,
      prismaLocation.address,
      prismaLocation.city,
      prismaLocation.country,
      coordinates,
      prismaLocation.timeZone,
      prismaLocation.lastUpdated,
      prismaLocation.name,
      prismaLocation.postalCode,
      prismaLocation.state,
      prismaLocation.relatedLocations, // Would need proper mapping
      prismaLocation.parkingType,
      undefined, // EVSEs - would need proper mapping from domain models
      prismaLocation.directions, // Would need proper mapping
      operator,
      suboperator,
      owner,
      prismaLocation.facilities,
      prismaLocation.openingTimes, // Would need proper mapping
      prismaLocation.chargingWhenClosed,
      images,
      prismaLocation.energyMix, // Would need proper mapping
      prismaLocation.publishAllowedTo, // Would need proper mapping
    )
  }

  private mapDomainToPrisma(
    location: Location,
  ): Prisma.OcpiLocationCreateInput {
    return {
      countryCode: location.id.countryCode,
      partyId: location.id.partyId,
      locationId: location.id.id,
      publish: location.publish,
      publishAllowedTo: location.publishAllowedTo as unknown,
      name: location.name,
      address: location.address,
      city: location.city,
      postalCode: location.postalCode,
      state: location.state,
      country: location.country,
      coordinates: {
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
      },
      relatedLocations: location.relatedLocations as unknown,
      parkingType: location.parkingType,
      directions: location.directions,
      operator: location.operator as unknown,
      suboperator: location.suboperator as unknown,
      owner: location.owner as unknown,
      facilities: location.facilities ? (location.facilities as unknown[]) : [],
      timeZone: location.timeZone,
      openingTimes: location.openingTimes as unknown,
      chargingWhenClosed: location.chargingWhenClosed,
      images: location.images as unknown,
      energyMix: location.energyMix as unknown,
      lastUpdated: location.lastUpdated,
    }
  }

  private mapBusinessDetailsFromJson(
    json: unknown,
  ): BusinessDetails | undefined {
    if (!json || typeof json !== 'object') return undefined

    const businessDetails = json as {
      name?: string
      website?: string
      logo?: {
        url: string
        category: string
        type: string
        thumbnail?: string
        width?: number
        height?: number
      }
    }

    if (!businessDetails.name) return undefined

    const logo = businessDetails.logo
      ? new Image(
          businessDetails.logo.url,
          businessDetails.logo.category,
          businessDetails.logo.type,
          businessDetails.logo.thumbnail,
          businessDetails.logo.width,
          businessDetails.logo.height,
        )
      : undefined

    return new BusinessDetails(
      businessDetails.name,
      businessDetails.website,
      logo,
    )
  }

  private mapImagesFromJson(json: unknown): ReadonlyArray<Image> | undefined {
    if (!json || !Array.isArray(json)) return undefined

    return json.map((img: unknown) => {
      const imageData = img as {
        url: string
        category: string
        type: string
        thumbnail?: string
        width?: number
        height?: number
      }
      return new Image(
        imageData.url,
        imageData.category,
        imageData.type,
        imageData.thumbnail,
        imageData.width,
        imageData.height,
      )
    })
  }
}
