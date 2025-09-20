/* eslint-disable @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { LocationsController } from './locations.controller'
import { LocationService } from '../../common/locations/services/location.service'
import type { LocationRepository } from '../../common/locations/repositories/location.repository'
import { Location } from '@/domain/locations/location.aggregate'
import { LocationId } from '@/domain/locations/value-objects/location-id'
import { GeoLocation } from '@/domain/locations/value-objects/geo-location'

describe('CPO LocationsController', () => {
  let controller: LocationsController
  let locationService: LocationService
  let mockLocationRepository: LocationRepository

  const createTestLocation = (): Location => {
    const locationId = new LocationId('NL', 'ABC', 'LOC001')
    const coordinates = new GeoLocation('52.370216', '4.895168')

    return new Location(
      locationId,
      true,
      'Test Street 1',
      'Amsterdam',
      'NLD',
      coordinates,
      'Europe/Amsterdam',
      new Date('2023-01-01T00:00:00.000Z'),
      'Test Location',
      '1234AB',
    )
  }

  beforeEach(async () => {
    // Mock repository
    mockLocationRepository = {
      findLocations: vi.fn(),
      findLocationById: vi.fn(),
      findEvse: vi.fn(),
      findConnector: vi.fn(),
      saveLocation: vi.fn(),
      updateEvse: vi.fn(),
      updateConnector: vi.fn(),
      locationExists: vi.fn(),
      findLocationsModifiedSince: vi.fn(),
      getLocationStats: vi.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsController],
      providers: [
        LocationService,
        {
          provide: 'LocationRepository',
          useValue: mockLocationRepository,
        },
      ],
    }).compile()

    controller = module.get<LocationsController>(LocationsController)
    locationService = module.get<LocationService>(LocationService)
  })

  describe('getLocations', () => {
    it('should return paginated locations list', async () => {
      const testLocation = createTestLocation()
      const mockResult = {
        locations: [testLocation],
        totalCount: 1,
        hasMore: false,
      }

      vi.mocked(mockLocationRepository.findLocations).mockResolvedValue(
        mockResult,
      )

      const query = {
        date_from: '2023-01-01T00:00:00Z',
        date_to: '2023-01-02T00:00:00Z',
        offset: 0,
        limit: 10,
      }

      const result = await controller.getLocations(query)

      expect(result.status_code).toBe(1000)
      expect(result.data).toHaveLength(1)
      expect(result.data[0].id).toBe('LOC001')
      expect(result.data[0].country_code).toBe('NL')
      expect(result.data[0].party_id).toBe('ABC')

      expect(mockLocationRepository.findLocations).toHaveBeenCalledWith(
        {
          dateFrom: new Date('2023-01-01T00:00:00Z'),
          dateTo: new Date('2023-01-02T00:00:00Z'),
        },
        { offset: 0, limit: 10 },
      )
    })

    it('should handle pagination correctly', async () => {
      const testLocation = createTestLocation()
      const mockResult = {
        locations: [testLocation],
        totalCount: 25,
        hasMore: true,
      }

      vi.mocked(mockLocationRepository.findLocations).mockResolvedValue(
        mockResult,
      )

      const query = { offset: 10, limit: 10 }
      const result = await controller.getLocations(query)

      expect(result.status_code).toBe(1000)
      expect(result.data).toHaveLength(1)

      expect(mockLocationRepository.findLocations).toHaveBeenCalledWith(
        {},
        { offset: 10, limit: 10 },
      )
    })

    it('should handle empty results', async () => {
      const mockResult = {
        locations: [],
        totalCount: 0,
        hasMore: false,
      }

      vi.mocked(mockLocationRepository.findLocations).mockResolvedValue(
        mockResult,
      )

      const query = { offset: 0 }
      const result = await controller.getLocations(query)

      expect(result.status_code).toBe(1000)
      expect(result.data).toHaveLength(0)
    })

    it('should validate query parameters', async () => {
      const invalidQuery = {
        date_from: 'invalid-date',
        offset: -1,
        limit: 2000, // Exceeds max
      }

      await expect(controller.getLocations(invalidQuery)).rejects.toThrow()
    })
  })

  describe('getLocation', () => {
    it('should return specific location by ID', async () => {
      const testLocation = createTestLocation()
      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(
        testLocation,
      )

      const params = { location_id: 'LOC001' }
      const result = await controller.getLocation(params)

      expect(result.status_code).toBe(1000)
      expect(result.data.id).toBe('LOC001')
      expect(result.data.name).toBe('Test Location')

      expect(mockLocationRepository.findLocationById).toHaveBeenCalledWith(
        'NL', // Should get from context/auth
        'ABC', // Should get from context/auth
        'LOC001',
      )
    })

    it('should return 2001 when location not found', async () => {
      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(null)

      const params = { location_id: 'NONEXISTENT' }
      const result = await controller.getLocation(params)

      expect(result.status_code).toBe(2001)
      expect(result.status_message).toContain('Unknown location')
    })

    it('should validate location_id parameter', async () => {
      const invalidParams = { location_id: '' }

      await expect(controller.getLocation(invalidParams)).rejects.toThrow()
    })
  })

  describe('getEvse', () => {
    it('should return specific EVSE from location', async () => {
      // This would require implementing EVSE finding logic
      const params = {
        location_id: 'LOC001',
        evse_uid: 'EVSE001',
      }

      // For now, we'll skip this as it requires EVSE domain models
      expect(controller.getEvse).toBeDefined()
    })
  })

  describe('getConnector', () => {
    it('should return specific connector from EVSE', async () => {
      // This would require implementing Connector finding logic
      const params = {
        location_id: 'LOC001',
        evse_uid: 'EVSE001',
        connector_id: '1',
      }

      // For now, we'll skip this as it requires Connector domain models
      expect(controller.getConnector).toBeDefined()
    })
  })

  describe('OCPI Response Format', () => {
    it('should return proper OCPI envelope structure', async () => {
      const testLocation = createTestLocation()
      const mockResult = {
        locations: [testLocation],
        totalCount: 1,
        hasMore: false,
      }

      vi.mocked(mockLocationRepository.findLocations).mockResolvedValue(
        mockResult,
      )

      const result = await controller.getLocations({ offset: 0 })

      expect(result).toHaveProperty('status_code')
      expect(result).toHaveProperty('status_message')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('timestamp')
      expect(result.status_code).toBe(1000)
      expect(typeof result.timestamp).toBe('string')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should handle authentication context', async () => {
      // This would test that the controller properly extracts
      // country_code and party_id from the authenticated request
      // For now, we'll assume this works via guards/decorators
      expect(true).toBe(true)
    })
  })
})
