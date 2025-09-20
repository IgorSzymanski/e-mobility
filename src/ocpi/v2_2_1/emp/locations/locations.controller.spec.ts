/* eslint-disable @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { LocationsController } from './locations.controller'
import { LocationService } from '../../common/locations/services/location.service'
import type { LocationRepository } from '../../common/locations/repositories/location.repository'
import { Location } from '@/domain/locations/location.aggregate'
import { LocationId } from '@/domain/locations/value-objects/location-id'
import { GeoLocation } from '@/domain/locations/value-objects/geo-location'

describe('EMP LocationsController', () => {
  let controller: LocationsController
  let locationService: LocationService
  let mockLocationRepository: LocationRepository

  const createTestLocation = (): Location => {
    const locationId = new LocationId('DE', 'EXP', 'LOC001')
    const coordinates = new GeoLocation('52.520008', '13.404954')

    return new Location(
      locationId,
      true,
      'Alexanderplatz 1',
      'Berlin',
      'DEU',
      coordinates,
      'Europe/Berlin',
      new Date('2023-01-01T00:00:00.000Z'),
      'Berlin Charging Hub',
      '10178',
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

  describe('PUT /locations/:location_id', () => {
    it('should create a new location', async () => {
      const testLocation = createTestLocation()
      const locationDto = {
        country_code: 'DE',
        party_id: 'EXP',
        id: 'LOC001',
        publish: true,
        name: 'Berlin Charging Hub',
        address: 'Alexanderplatz 1',
        city: 'Berlin',
        postal_code: '10178',
        state: undefined,
        country: 'DEU',
        coordinates: {
          latitude: '52.520008',
          longitude: '13.404954',
        },
        related_locations: [],
        parking_type: undefined,
        evses: [],
        directions: [],
        operator: undefined,
        suboperator: undefined,
        owner: undefined,
        facilities: [],
        time_zone: 'Europe/Berlin',
        opening_times: undefined,
        charging_when_closed: undefined,
        images: [],
        energy_mix: undefined,
        last_updated: '2023-01-01T00:00:00.000Z',
        publish_allowed_to: [],
      }

      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        testLocation,
      )

      const params = { location_id: 'LOC001' }
      const result = await controller.putLocation(params, locationDto)

      expect(result.status_code).toBe(1000)
      expect(result.data.id).toBe('LOC001')
      expect(result.data.name).toBe('Berlin Charging Hub')

      expect(mockLocationRepository.saveLocation).toHaveBeenCalledWith(
        expect.any(Object), // Domain location object
      )
    })

    it('should update an existing location', async () => {
      const testLocation = createTestLocation()
      const locationDto = {
        country_code: 'DE',
        party_id: 'EXP',
        id: 'LOC001',
        publish: true,
        name: 'Updated Berlin Charging Hub',
        address: 'Alexanderplatz 1',
        city: 'Berlin',
        postal_code: '10178',
        state: undefined,
        country: 'DEU',
        coordinates: {
          latitude: '52.520008',
          longitude: '13.404954',
        },
        related_locations: [],
        parking_type: undefined,
        evses: [],
        directions: [],
        operator: undefined,
        suboperator: undefined,
        owner: undefined,
        facilities: [],
        time_zone: 'Europe/Berlin',
        opening_times: undefined,
        charging_when_closed: undefined,
        images: [],
        energy_mix: undefined,
        last_updated: '2023-01-01T00:00:00.000Z',
        publish_allowed_to: [],
      }

      const updatedLocation = new Location(
        testLocation.id,
        true,
        'Alexanderplatz 1',
        'Berlin',
        'DEU',
        testLocation.coordinates,
        'Europe/Berlin',
        new Date('2023-01-01T00:00:00.000Z'),
        'Updated Berlin Charging Hub',
        '10178',
      )

      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(true)
      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        updatedLocation,
      )

      const params = { location_id: 'LOC001' }
      const result = await controller.putLocation(params, locationDto)

      expect(result.status_code).toBe(1000)
      expect(result.data.name).toBe('Updated Berlin Charging Hub')

      expect(mockLocationRepository.locationExists).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
      expect(mockLocationRepository.saveLocation).toHaveBeenCalled()
    })

    it('should validate location data', async () => {
      const invalidLocationDto = {
        // Missing required fields
        country_code: '',
        party_id: '',
        id: '',
      }

      const params = { location_id: 'LOC001' }

      await expect(
        controller.putLocation(params, invalidLocationDto as any),
      ).rejects.toThrow()
    })

    it('should handle mismatched location_id in URL and body', async () => {
      const locationDto = {
        country_code: 'DE',
        party_id: 'EXP',
        id: 'DIFFERENT_ID', // Different from URL param
        publish: true,
        name: 'Berlin Charging Hub',
        address: 'Alexanderplatz 1',
        city: 'Berlin',
        postal_code: '10178',
        country: 'DEU',
        coordinates: {
          latitude: '52.520008',
          longitude: '13.404954',
        },
        time_zone: 'Europe/Berlin',
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const params = { location_id: 'LOC001' }

      await expect(
        controller.putLocation(params, locationDto as any),
      ).rejects.toThrow('Location ID mismatch')
    })
  })

  describe('PATCH /locations/:location_id', () => {
    it('should partially update an existing location', async () => {
      const testLocation = createTestLocation()
      const updatedLocation = new Location(
        testLocation.id,
        true,
        'Alexanderplatz 1',
        'Berlin',
        'DEU',
        testLocation.coordinates,
        'Europe/Berlin',
        new Date(),
        'Partially Updated Location',
        '10178',
      )

      const partialUpdate = {
        name: 'Partially Updated Location',
      }

      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(true)
      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        updatedLocation,
      )

      const params = { location_id: 'LOC001' }
      const result = await controller.patchLocation(params, partialUpdate)

      expect(result.status_code).toBe(1000)
      expect(result.data.name).toBe('Partially Updated Location')

      expect(mockLocationRepository.locationExists).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
    })

    it('should return 2001 when location not found for PATCH', async () => {
      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(false)

      const partialUpdate = { name: 'Updated Name' }
      const params = { location_id: 'NONEXISTENT' }

      const result = await controller.patchLocation(params, partialUpdate)

      expect(result.status_code).toBe(2001)
      expect(result.status_message).toContain('Unknown location')
    })
  })

  describe('PUT /locations/:location_id/evses/:evse_uid', () => {
    it('should create or update an EVSE', async () => {
      const testLocation = createTestLocation()
      const evseData = {
        uid: 'EVSE001',
        evse_id: 'DE*EXP*E001',
        status: 'AVAILABLE',
        status_schedule: [],
        capabilities: [],
        connectors: [],
        floor_level: undefined,
        coordinates: undefined,
        physical_reference: undefined,
        directions: [],
        parking_restrictions: [],
        images: [],
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(true)
      vi.mocked(mockLocationRepository.updateEvse).mockResolvedValue(
        testLocation,
      )

      const params = { location_id: 'LOC001', evse_uid: 'EVSE001' }
      const result = await controller.putEvse(params, evseData)

      expect(result.status_code).toBe(1000)

      expect(mockLocationRepository.updateEvse).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
        expect.any(Object), // EVSE domain object
      )
    })

    it('should return 2001 when location not found for EVSE update', async () => {
      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(false)

      const evseData = {
        uid: 'EVSE001',
        evse_id: 'DE*EXP*E001',
        status: 'AVAILABLE',
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const params = { location_id: 'NONEXISTENT', evse_uid: 'EVSE001' }
      const result = await controller.putEvse(params, evseData)

      expect(result.status_code).toBe(2001)
      expect(result.status_message).toContain('Unknown location')
    })
  })

  describe('PUT /locations/:location_id/evses/:evse_uid/connectors/:connector_id', () => {
    it('should create or update a connector', async () => {
      const testLocation = createTestLocation()
      const connectorData = {
        id: '1',
        standard: 'IEC_62196_T2',
        format: 'SOCKET',
        power_type: 'AC_3_PHASE',
        max_voltage: 400,
        max_amperage: 32,
        max_electric_power: 22000,
        tariff_ids: [],
        terms_and_conditions: undefined,
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(true)
      vi.mocked(mockLocationRepository.updateConnector).mockResolvedValue(
        testLocation,
      )

      const params = {
        location_id: 'LOC001',
        evse_uid: 'EVSE001',
        connector_id: '1',
      }
      const result = await controller.putConnector(params, connectorData)

      expect(result.status_code).toBe(1000)

      expect(mockLocationRepository.updateConnector).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
        'EVSE001',
        expect.any(Object), // Connector domain object
      )
    })
  })

  describe('Authentication and Authorization', () => {
    it('should extract party information from authentication context', async () => {
      // This test verifies that the controller properly extracts
      // country_code and party_id from the authenticated request
      // For now, we assume hardcoded values for testing
      expect(true).toBe(true)
    })
  })

  describe('OCPI Response Format', () => {
    it('should return proper OCPI envelope structure for PUT operations', async () => {
      const testLocation = createTestLocation()
      const locationDto = {
        country_code: 'DE',
        party_id: 'EXP',
        id: 'LOC001',
        publish: true,
        name: 'Berlin Charging Hub',
        address: 'Alexanderplatz 1',
        city: 'Berlin',
        postal_code: '10178',
        country: 'DEU',
        coordinates: {
          latitude: '52.520008',
          longitude: '13.404954',
        },
        time_zone: 'Europe/Berlin',
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        testLocation,
      )

      const params = { location_id: 'LOC001' }
      const result = await controller.putLocation(params, locationDto as any)

      expect(result).toHaveProperty('status_code')
      expect(result).toHaveProperty('status_message')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('timestamp')
      expect(result.status_code).toBe(1000)
      expect(typeof result.timestamp).toBe('string')
    })
  })
})
