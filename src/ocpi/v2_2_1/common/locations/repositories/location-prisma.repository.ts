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
import {
  Image,
  type ImageCategory,
} from '@/domain/locations/value-objects/image'
import { OcpiContextService } from '@/ocpi/common/services/ocpi-context.service'
import { Logger } from '@nestjs/common'
import { z } from 'zod'

// Zod schemas for JSON validation

const BusinessDetailsJsonSchema = z
  .object({
    name: z.string(),
    website: z.string().optional(),
    logo: z
      .object({
        url: z.string(),
        category: z.string(),
        type: z.string(),
        thumbnail: z.string().optional(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
      .optional(),
  })
  .optional()

const ImageJsonSchema = z.object({
  url: z.string(),
  category: z.string(),
  type: z.string(),
  thumbnail: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
})

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
      prismaLocation.state ?? undefined,
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
    // Helper function to safely convert domain objects to Prisma JSON
    const toPrismaJson = (value: unknown): any => {
      if (value === null || value === undefined) return undefined
      try {
        return JSON.parse(JSON.stringify(value))
      } catch {
        return undefined
      }
    }

    return {
      countryCode: location.id.countryCode,
      partyId: location.id.partyId,
      locationId: location.id.id,
      publish: location.publish,
      publishAllowedTo: toPrismaJson(location.publishAllowedTo),
      name: location.name,
      address: location.address,
      city: location.city,
      postalCode: location.postalCode,
      state: location.state ?? undefined,
      country: location.country,
      coordinates: {
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
      },
      relatedLocations: toPrismaJson(location.relatedLocations),
      parkingType: location.parkingType,
      directions: toPrismaJson(location.directions),
      operator: toPrismaJson(location.operator),
      suboperator: toPrismaJson(location.suboperator),
      owner: toPrismaJson(location.owner),
      facilities: location.facilities
        ? toPrismaJson(location.facilities) || []
        : [],
      timeZone: location.timeZone,
      openingTimes: toPrismaJson(location.openingTimes),
      chargingWhenClosed: location.chargingWhenClosed,
      images: toPrismaJson(location.images),
      energyMix: toPrismaJson(location.energyMix),
      lastUpdated: location.lastUpdated,
    }
  }

  private mapBusinessDetailsFromJson(
    json: unknown,
  ): BusinessDetails | undefined {
    const parsed = BusinessDetailsJsonSchema.safeParse(json)
    if (!parsed.success || !parsed.data?.name) return undefined

    const businessDetails = parsed.data

    const logo = businessDetails.logo
      ? new Image(
          businessDetails.logo.url,
          businessDetails.logo.category as ImageCategory,
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

    const images: Image[] = []
    for (const img of json) {
      const parsed = ImageJsonSchema.safeParse(img)
      if (parsed.success) {
        images.push(
          new Image(
            parsed.data.url,
            parsed.data.category as ImageCategory,
            parsed.data.type,
            parsed.data.thumbnail,
            parsed.data.width,
            parsed.data.height,
          ),
        )
      }
    }
    return images.length > 0 ? images : undefined
  }
}
