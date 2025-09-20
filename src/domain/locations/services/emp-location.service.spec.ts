import { EmpLocationService } from './emp-location.service'
import { Location } from '../location.aggregate'
import { LocationId } from '../value-objects/location-id'
import { GeoLocation } from '../value-objects/geo-location'
import { EVSE } from '../entities/evse'
import { Connector } from '../entities/connector'
import type { LocationRepository } from '../../../ocpi/v2_2_1/common/locations/repositories/location.repository'
import {
  OcpiInvalidParametersException,
  OcpiUnknownLocationException,
} from '../../../shared/exceptions/ocpi.exceptions'

describe('EmpLocationService', () => {
  let service: EmpLocationService
  let mockLocationRepository: LocationRepository

  const createMockLocation = (
    countryCode = 'DE',
    partyId = 'EXP',
    locationId = 'LOC001',
  ): Location => {
    const id = new LocationId(countryCode, partyId, locationId)
    const coordinates = new GeoLocation('52.5200', '13.4050')

    return new Location(
      id,
      true, // publish
      'Test Street 123',
      'Berlin',
      'DEU',
      coordinates,
      'Europe/Berlin',
      new Date(),
    )
  }

  const createMockEvse = (): EVSE => {
    const connector = new Connector(
      'CONN001',
      'IEC_62196_T2',
      'SOCKET',
      'AC_3_PHASE',
      400,
      32,
      new Date(),
      22000,
      ['TARIFF001'],
    )

    return new EVSE(
      'EVSE001',
      'AVAILABLE',
      [connector],
      new Date(),
      'DE*EXP*EVSE001',
    )
  }

  const createMockConnector = (): Connector => {
    return new Connector(
      'CONN002',
      'IEC_62196_T2_COMBO',
      'CABLE',
      'DC',
      800,
      125,
      new Date(),
      100000,
      ['TARIFF002'],
    )
  }

  beforeEach(() => {
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

    service = new EmpLocationService(mockLocationRepository)
  })

  describe('createOrUpdateLocation', () => {
    it('should create a new location when it does not exist', async () => {
      const location = createMockLocation()
      const request = {
        locationData: location,
        countryCode: 'DE',
        partyId: 'EXP',
      }

      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(false)
      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(location)

      const result = await service.createOrUpdateLocation(request)

      expect(mockLocationRepository.locationExists).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
      expect(mockLocationRepository.saveLocation).toHaveBeenCalledWith(location)
      expect(result).toBe(location)
    })

    it('should update an existing location when it exists', async () => {
      const existingLocation = createMockLocation()
      const newLocation = createMockLocation()
      const request = {
        locationData: newLocation,
        countryCode: 'DE',
        partyId: 'EXP',
      }

      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(true)
      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(
        existingLocation,
      )
      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        newLocation,
      )

      const result = await service.createOrUpdateLocation(request)

      expect(mockLocationRepository.findLocationById).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
      expect(mockLocationRepository.saveLocation).toHaveBeenCalled()
      expect(result).toBe(newLocation)
    })

    it('should throw error when location exists but cannot be retrieved', async () => {
      const location = createMockLocation()
      const request = {
        locationData: location,
        countryCode: 'DE',
        partyId: 'EXP',
      }

      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(true)
      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(null)

      await expect(service.createOrUpdateLocation(request)).rejects.toThrow(
        OcpiUnknownLocationException,
      )
    })

    it('should throw error when location country code does not match authenticated party', async () => {
      const location = createMockLocation('NL', 'EXP', 'LOC001') // Wrong country
      const request = {
        locationData: location,
        countryCode: 'DE', // Authenticated as DE
        partyId: 'EXP',
      }

      await expect(service.createOrUpdateLocation(request)).rejects.toThrow(
        OcpiInvalidParametersException,
      )
      expect(
        vi.mocked(mockLocationRepository.locationExists),
      ).not.toHaveBeenCalled()
    })

    it('should throw error when location party ID does not match authenticated party', async () => {
      const location = createMockLocation('DE', 'ABC', 'LOC001') // Wrong party
      const request = {
        locationData: location,
        countryCode: 'DE',
        partyId: 'EXP', // Authenticated as EXP
      }

      await expect(service.createOrUpdateLocation(request)).rejects.toThrow(
        OcpiInvalidParametersException,
      )
      expect(
        vi.mocked(mockLocationRepository.locationExists),
      ).not.toHaveBeenCalled()
    })

    it('should throw error when creating location with empty ID (domain validation)', () => {
      // The LocationId constructor itself validates that ID cannot be empty
      // This test verifies the domain validation works before service validation
      expect(() => createMockLocation('DE', 'EXP', '')).toThrow(
        OcpiInvalidParametersException,
      )
    })
  })

  describe('updateLocationPartial', () => {
    it('should update location with partial data', async () => {
      const existingLocation = createMockLocation()
      const partialData = { publish: false }
      const request = {
        locationId: 'LOC001',
        partialData,
        countryCode: 'DE',
        partyId: 'EXP',
      }

      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(
        existingLocation,
      )
      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        existingLocation,
      )

      const result = await service.updateLocationPartial(request)

      expect(mockLocationRepository.findLocationById).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
      expect(mockLocationRepository.saveLocation).toHaveBeenCalled()
      expect(result).toBe(existingLocation)
    })

    it('should throw error when location does not exist', async () => {
      const request = {
        locationId: 'NONEXISTENT',
        partialData: { publish: false },
        countryCode: 'DE',
        partyId: 'EXP',
      }

      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(null)

      await expect(service.updateLocationPartial(request)).rejects.toThrow(
        OcpiUnknownLocationException,
      )
    })
  })

  describe('updateEvse', () => {
    it('should add new EVSE when it does not exist', async () => {
      const existingLocation = createMockLocation()
      const newEvse = createMockEvse()
      const request = {
        countryCode: 'DE',
        partyId: 'EXP',
        locationId: 'LOC001',
        evseUid: 'EVSE001',
        evse: newEvse,
      }

      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(
        existingLocation,
      )
      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        existingLocation,
      )

      const result = await service.updateEvse(request)

      expect(mockLocationRepository.findLocationById).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
      expect(mockLocationRepository.saveLocation).toHaveBeenCalled()
      expect(result).toBe(existingLocation)
    })

    it('should throw error when location does not exist', async () => {
      const newEvse = createMockEvse()
      const request = {
        countryCode: 'DE',
        partyId: 'EXP',
        locationId: 'NONEXISTENT',
        evseUid: 'EVSE001',
        evse: newEvse,
      }

      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(null)

      await expect(service.updateEvse(request)).rejects.toThrow(
        OcpiUnknownLocationException,
      )
    })
  })

  describe('updateConnector', () => {
    it('should add new connector when it does not exist', async () => {
      const evse = createMockEvse()
      const existingLocation = new Location(
        new LocationId('DE', 'EXP', 'LOC001'),
        true,
        'Test Street 123',
        'Berlin',
        'DEU',
        new GeoLocation('52.5200', '13.4050'),
        'Europe/Berlin',
        new Date(),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        [evse],
      )

      const newConnector = createMockConnector()
      const request = {
        countryCode: 'DE',
        partyId: 'EXP',
        locationId: 'LOC001',
        evseUid: 'EVSE001',
        connectorId: 'CONN002',
        connector: newConnector,
      }

      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(
        existingLocation,
      )
      vi.mocked(mockLocationRepository.saveLocation).mockResolvedValue(
        existingLocation,
      )

      const result = await service.updateConnector(request)

      expect(mockLocationRepository.findLocationById).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
      expect(mockLocationRepository.saveLocation).toHaveBeenCalled()
      expect(result).toBe(existingLocation)
    })

    it('should throw error when location does not exist', async () => {
      const newConnector = createMockConnector()
      const request = {
        countryCode: 'DE',
        partyId: 'EXP',
        locationId: 'NONEXISTENT',
        evseUid: 'EVSE001',
        connectorId: 'CONN002',
        connector: newConnector,
      }

      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(null)

      await expect(service.updateConnector(request)).rejects.toThrow(
        OcpiUnknownLocationException,
      )
    })

    it('should throw error when EVSE does not exist', async () => {
      const existingLocation = createMockLocation() // No EVSEs
      const newConnector = createMockConnector()
      const request = {
        countryCode: 'DE',
        partyId: 'EXP',
        locationId: 'LOC001',
        evseUid: 'NONEXISTENT_EVSE',
        connectorId: 'CONN002',
        connector: newConnector,
      }

      vi.mocked(mockLocationRepository.findLocationById).mockResolvedValue(
        existingLocation,
      )

      await expect(service.updateConnector(request)).rejects.toThrow(
        OcpiUnknownLocationException,
      )
    })
  })

  describe('validateLocationAccess', () => {
    it('should return true when location exists', async () => {
      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(true)

      const result = await service.validateLocationAccess('DE', 'EXP', 'LOC001')

      expect(result).toBe(true)
      expect(mockLocationRepository.locationExists).toHaveBeenCalledWith(
        'DE',
        'EXP',
        'LOC001',
      )
    })

    it('should return false when location does not exist', async () => {
      vi.mocked(mockLocationRepository.locationExists).mockResolvedValue(false)

      const result = await service.validateLocationAccess(
        'DE',
        'EXP',
        'NONEXISTENT',
      )

      expect(result).toBe(false)
    })
  })
})
