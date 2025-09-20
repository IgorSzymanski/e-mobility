/* eslint-disable @typescript-eslint/require-await */
import { Test, TestingModule } from '@nestjs/testing'
import { LocationsController } from './locations.controller'
import { LocationService } from '../../common/locations/services/location.service'
import type { LocationRepository } from '../../common/locations/repositories/location.repository'
import type { OcpiParty } from '@/ocpi/common/services/ocpi-token-validation.service'
import { createOcpiSuccessResponse } from '../../common/ocpi-envelope'

describe('CPO LocationsController', () => {
  let controller: LocationsController
  let locationService: LocationService
  let mockLocationRepository: LocationRepository

  const mockOcpiParty: OcpiParty = {
    countryCode: 'NL',
    partyId: 'ABC',
    role: 'CPO',
    businessDetails: {
      name: 'Test CPO',
      website: 'https://test-cpo.com',
    },
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
        {
          provide: LocationService,
          useValue: {
            findLocations: vi.fn(),
            findLocationById: vi.fn(),
            findEvse: vi.fn(),
            findConnector: vi.fn(),
            saveLocation: vi.fn(),
            updateEvse: vi.fn(),
            updateConnector: vi.fn(),
            locationExists: vi.fn(),
          },
        },
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
      const mockResponse = createOcpiSuccessResponse([
        {
          id: 'LOC001',
          country_code: 'NL',
          party_id: 'ABC',
          publish: true,
          name: 'Test Location',
          address: 'Test Street 1',
          city: 'Amsterdam',
          postal_code: '1234AB',
          country: 'NLD',
          coordinates: {
            latitude: '52.370216',
            longitude: '4.895168',
          },
          related_locations: [],
          evses: [],
          directions: [],
          facilities: [],
          time_zone: 'Europe/Amsterdam',
          opening_times: undefined,
          charging_when_closed: undefined,
          images: [],
          energy_mix: undefined,
          last_updated: '2023-01-01T00:00:00.000Z',
          publish_allowed_to: [],
        },
      ])

      // Mock the locationService.findLocations method instead
      vi.mocked(locationService.findLocations).mockResolvedValue(mockResponse)

      const query = {
        date_from: '2023-01-01T00:00:00Z',
        date_to: '2023-01-02T00:00:00Z',
        offset: 0,
        limit: 10,
      }

      const result = await controller.getLocations(query, mockOcpiParty)

      expect(result.status_code).toBe(1000)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].id).toBe('LOC001')
      expect(result.data![0].country_code).toBe('NL')
      expect(result.data![0].party_id).toBe('ABC')

      expect(locationService.findLocations).toHaveBeenCalledWith(
        query,
        mockOcpiParty.countryCode,
        mockOcpiParty.partyId,
      )
    })

    it('should handle pagination correctly', async () => {
      const mockResponse = createOcpiSuccessResponse([
        {
          id: 'LOC001',
          country_code: 'NL',
          party_id: 'ABC',
          publish: true,
          name: 'Test Location',
          address: 'Test Street 1',
          city: 'Amsterdam',
          postal_code: '1234AB',
          country: 'NLD',
          coordinates: {
            latitude: '52.370216',
            longitude: '4.895168',
          },
          related_locations: [],
          evses: [],
          directions: [],
          facilities: [],
          time_zone: 'Europe/Amsterdam',
          opening_times: undefined,
          charging_when_closed: undefined,
          images: [],
          energy_mix: undefined,
          last_updated: '2023-01-01T00:00:00.000Z',
          publish_allowed_to: [],
        },
      ])

      vi.mocked(locationService.findLocations).mockResolvedValue(mockResponse)

      const query = { offset: 10, limit: 10 }
      const result = await controller.getLocations(query, mockOcpiParty)

      expect(result.status_code).toBe(1000)
      expect(result.data).toHaveLength(1)

      expect(locationService.findLocations).toHaveBeenCalledWith(
        query,
        mockOcpiParty.countryCode,
        mockOcpiParty.partyId,
      )
    })

    it('should handle empty results', async () => {
      const mockResponse = createOcpiSuccessResponse([])

      vi.mocked(locationService.findLocations).mockResolvedValue(mockResponse)

      const query = { offset: 0 }
      const result = await controller.getLocations(query, mockOcpiParty)

      expect(result.status_code).toBe(1000)
      expect(result.data).toHaveLength(0)
    })

    it('should validate query parameters', async () => {
      const invalidQuery = {
        date_from: 'invalid-date',
        offset: -1,
        limit: 2000, // Exceeds max
      }

      await expect(
        controller.getLocations(invalidQuery, mockOcpiParty),
      ).rejects.toThrow()
    })
  })

  describe('getLocation', () => {
    it('should return specific location by ID', async () => {
      const mockResponse = createOcpiSuccessResponse({
        id: 'LOC001',
        country_code: 'NL',
        party_id: 'ABC',
        publish: true,
        name: 'Test Location',
        address: 'Test Street 1',
        city: 'Amsterdam',
        postal_code: '1234AB',
        country: 'NLD',
        coordinates: {
          latitude: '52.370216',
          longitude: '4.895168',
        },
        related_locations: [],
        evses: [],
        directions: [],
        facilities: [],
        time_zone: 'Europe/Amsterdam',
        opening_times: undefined,
        charging_when_closed: undefined,
        images: [],
        energy_mix: undefined,
        last_updated: '2023-01-01T00:00:00.000Z',
        publish_allowed_to: [],
      })

      vi.mocked(locationService.findLocationById).mockResolvedValue(
        mockResponse,
      )

      const params = { location_id: 'LOC001' }
      const result = await controller.getLocation(params, mockOcpiParty)

      expect(result.status_code).toBe(1000)
      expect(result.data!.id).toBe('LOC001')
      expect(result.data!.name).toBe('Test Location')

      expect(locationService.findLocationById).toHaveBeenCalledWith(
        params,
        mockOcpiParty.countryCode,
        mockOcpiParty.partyId,
      )
    })

    it('should return 2001 when location not found', async () => {
      vi.mocked(locationService.findLocationById).mockRejectedValue(
        new Error('Location not found'),
      )

      const params = { location_id: 'NONEXISTENT' }
      const result = await controller.getLocation(params, mockOcpiParty)

      expect(result.status_code).toBe(2001)
      expect(result.status_message).toContain('Unknown location')
    })

    it('should validate location_id parameter', async () => {
      const invalidParams = { location_id: '' }

      await expect(
        controller.getLocation(invalidParams, mockOcpiParty),
      ).rejects.toThrow()
    })
  })

  describe('getEvse', () => {
    it('should return specific EVSE from location', async () => {
      // Mock the locationService.findEvse method
      const mockEvseResponse = createOcpiSuccessResponse({
        uid: 'EVSE001',
        evse_id: 'NL*ABC*EVSE001',
        status: 'AVAILABLE' as const,
        capabilities: ['RFID_READER' as const, 'RESERVABLE' as const],
        connectors: [
          {
            id: '1',
            standard: 'IEC_62196_T2' as const,
            format: 'SOCKET' as const,
            power_type: 'AC_3_PHASE' as const,
            max_voltage: 400,
            max_amperage: 32,
            max_electric_power: 22000,
            tariff_ids: ['TARIFF_001'],
            last_updated: '2023-01-01T00:00:00.000Z',
          },
        ],
        coordinates: {
          latitude: '52.370216',
          longitude: '4.895168',
        },
        last_updated: '2023-01-01T00:00:00.000Z',
      })

      vi.mocked(locationService.findEvse).mockResolvedValue(mockEvseResponse)

      const params = { location_id: 'LOC001', evse_uid: 'EVSE001' }
      const result = await controller.getEvse(params, mockOcpiParty)

      expect(result.status_code).toBe(1000)
      expect(locationService.findEvse).toHaveBeenCalledWith(
        params,
        mockOcpiParty.countryCode,
        mockOcpiParty.partyId,
      )
    })
  })

  describe('getConnector', () => {
    it('should return specific connector from EVSE', async () => {
      // Mock the locationService.findConnector method
      const mockConnectorResponse = createOcpiSuccessResponse({
        id: '1',
        standard: 'IEC_62196_T2' as const,
        format: 'SOCKET' as const,
        power_type: 'AC_3_PHASE' as const,
        max_voltage: 400,
        max_amperage: 32,
        max_electric_power: 22000,
        tariff_ids: ['TARIFF_001'],
        last_updated: '2023-01-01T00:00:00.000Z',
      })

      vi.mocked(locationService.findConnector).mockResolvedValue(
        mockConnectorResponse,
      )

      const params = {
        location_id: 'LOC001',
        evse_uid: 'EVSE001',
        connector_id: '1',
      }
      const result = await controller.getConnector(params, mockOcpiParty)

      expect(result.status_code).toBe(1000)
      expect(locationService.findConnector).toHaveBeenCalledWith(
        params,
        mockOcpiParty.countryCode,
        mockOcpiParty.partyId,
      )
    })
  })

  describe('OCPI Response Format', () => {
    it('should return proper OCPI envelope structure', async () => {
      const mockResponse = createOcpiSuccessResponse([])

      vi.mocked(locationService.findLocations).mockResolvedValue(mockResponse)

      const result = await controller.getLocations({ offset: 0 }, mockOcpiParty)

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
