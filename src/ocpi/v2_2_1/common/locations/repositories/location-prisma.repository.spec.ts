import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { LocationPrismaRepository } from './location-prisma.repository'
import { PrismaClient } from '@prisma/client'
import { Location } from '@/domain/locations/location.aggregate'
import { LocationId } from '@/domain/locations/value-objects/location-id'
import { GeoLocation } from '@/domain/locations/value-objects/geo-location'

describe('LocationPrismaRepository', () => {
  let repository: LocationPrismaRepository
  let prisma: PrismaClient

  beforeEach(() => {
    prisma = new PrismaClient()
    repository = new LocationPrismaRepository(prisma)
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.ocpiLocation.deleteMany()
    await prisma.$disconnect()
  })

  const createTestLocation = (): Location => {
    const locationId = new LocationId('NL', 'ABC', 'LOC001')
    const coordinates = new GeoLocation('52.370216', '4.895168')

    return new Location(
      locationId,
      true, // publish
      'Test Street 1', // address
      'Amsterdam', // city
      'NLD', // country
      coordinates,
      'Europe/Amsterdam', // timeZone
      new Date('2023-01-01T00:00:00.000Z'), // lastUpdated
      'Test Location', // name
      '1234AB', // postalCode
    )
  }

  describe('saveLocation', () => {
    it('should save a new location successfully', async () => {
      const location = createTestLocation()

      const savedLocation = await repository.saveLocation(location)

      expect(savedLocation.id.id).toBe('LOC001')
      expect(savedLocation.id.countryCode).toBe('NL')
      expect(savedLocation.id.partyId).toBe('ABC')
      expect(savedLocation.name).toBe('Test Location')
      expect(savedLocation.publish).toBe(true)
    })

    it('should update an existing location', async () => {
      const location = createTestLocation()

      // Save initial location
      await repository.saveLocation(location)

      // Update the location
      const updatedLocation = location.updatePublishStatus(false)
      const result = await repository.saveLocation(updatedLocation)

      expect(result.publish).toBe(false)
      expect(result.id.id).toBe('LOC001')
    })
  })

  describe('findLocationById', () => {
    it('should find an existing location', async () => {
      const location = createTestLocation()
      await repository.saveLocation(location)

      const found = await repository.findLocationById('NL', 'ABC', 'LOC001')

      expect(found).not.toBeNull()
      expect(found!.id.id).toBe('LOC001')
      expect(found!.name).toBe('Test Location')
    })

    it('should return null for non-existent location', async () => {
      const found = await repository.findLocationById(
        'XX',
        'YYY',
        'NONEXISTENT',
      )

      expect(found).toBeNull()
    })
  })

  describe('findLocations', () => {
    it('should find locations with pagination', async () => {
      const location1 = createTestLocation()
      const location2Id = new LocationId('NL', 'ABC', 'LOC002')
      const coordinates2 = new GeoLocation('51.922211', '4.479677')

      const location2 = new Location(
        location2Id,
        true,
        'Test Street 2',
        'Rotterdam',
        'NLD',
        coordinates2,
        'Europe/Amsterdam',
        new Date('2023-01-02T00:00:00.000Z'),
        'Test Location 2',
      )

      await repository.saveLocation(location1)
      await repository.saveLocation(location2)

      const result = await repository.findLocations(
        {},
        { offset: 0, limit: 10 },
      )

      expect(result.locations).toHaveLength(2)
      expect(result.totalCount).toBe(2)
      expect(result.hasMore).toBe(false)
    })

    it('should filter locations by date range', async () => {
      const location = createTestLocation()
      await repository.saveLocation(location)

      const result = await repository.findLocations(
        {
          dateFrom: new Date('2022-12-31T00:00:00.000Z'),
          dateTo: new Date('2023-01-02T00:00:00.000Z'),
        },
        { offset: 0 },
      )

      expect(result.locations).toHaveLength(1)
      expect(result.locations[0].id.id).toBe('LOC001')
    })

    it('should filter locations by country and party', async () => {
      const location = createTestLocation()
      await repository.saveLocation(location)

      // Should find the location
      const result1 = await repository.findLocations(
        { countryCode: 'NL', partyId: 'ABC' },
        { offset: 0 },
      )
      expect(result1.locations).toHaveLength(1)

      // Should not find with different country/party
      const result2 = await repository.findLocations(
        { countryCode: 'DE', partyId: 'XYZ' },
        { offset: 0 },
      )
      expect(result2.locations).toHaveLength(0)
    })

    it('should filter by publish status', async () => {
      const publishedLocation = createTestLocation()

      // Create a different location for unpublished test
      const locationId2 = new LocationId('NL', 'ABC', 'LOC002')
      const coordinates2 = new GeoLocation('51.922211', '4.479677')
      const unpublishedLocation = new Location(
        locationId2,
        false, // unpublished
        'Test Street 2',
        'Rotterdam',
        'NLD',
        coordinates2,
        'Europe/Amsterdam',
        new Date('2023-01-02T00:00:00.000Z'),
        'Test Location 2',
      )

      await repository.saveLocation(publishedLocation)
      await repository.saveLocation(unpublishedLocation)

      const publishedResult = await repository.findLocations(
        { publish: true },
        { offset: 0 },
      )
      expect(publishedResult.locations).toHaveLength(1)
      expect(publishedResult.locations[0].publish).toBe(true)

      const unpublishedResult = await repository.findLocations(
        { publish: false },
        { offset: 0 },
      )
      expect(unpublishedResult.locations).toHaveLength(1)
      expect(unpublishedResult.locations[0].publish).toBe(false)
    })
  })

  describe('locationExists', () => {
    it('should return true for existing location', async () => {
      const location = createTestLocation()
      await repository.saveLocation(location)

      const exists = await repository.locationExists('NL', 'ABC', 'LOC001')

      expect(exists).toBe(true)
    })

    it('should return false for non-existent location', async () => {
      const exists = await repository.locationExists('XX', 'YYY', 'NONEXISTENT')

      expect(exists).toBe(false)
    })
  })

  describe('findLocationsModifiedSince', () => {
    it('should find locations modified after specific date', async () => {
      const location = createTestLocation()
      await repository.saveLocation(location)

      const result = await repository.findLocationsModifiedSince(
        new Date('2022-12-31T00:00:00.000Z'),
        { offset: 0 },
      )

      expect(result.locations).toHaveLength(1)
      expect(result.locations[0].id.id).toBe('LOC001')
    })

    it('should not find locations modified before specific date', async () => {
      const location = createTestLocation()
      await repository.saveLocation(location)

      const result = await repository.findLocationsModifiedSince(
        new Date('2023-02-01T00:00:00.000Z'),
        { offset: 0 },
      )

      expect(result.locations).toHaveLength(0)
    })
  })

  describe('getLocationStats', () => {
    it('should return correct statistics for a party', async () => {
      const location = createTestLocation()
      await repository.saveLocation(location)

      const stats = await repository.getLocationStats('NL', 'ABC')

      expect(stats.totalLocations).toBe(1)
      expect(stats.publishedLocations).toBe(1)
      expect(stats.totalEvses).toBe(0) // No EVSEs in test location
      expect(stats.totalConnectors).toBe(0) // No connectors in test location
    })

    it('should return zero statistics for non-existent party', async () => {
      const stats = await repository.getLocationStats('XX', 'YYY')

      expect(stats.totalLocations).toBe(0)
      expect(stats.publishedLocations).toBe(0)
      expect(stats.totalEvses).toBe(0)
      expect(stats.totalConnectors).toBe(0)
    })
  })
})
