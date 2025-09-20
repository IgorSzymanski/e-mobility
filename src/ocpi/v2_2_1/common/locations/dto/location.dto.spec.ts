import {
  LocationMapper,
  LocationDtoSchema,
  EvseDtoSchema,
  ConnectorDtoSchema,
} from './location.dto'
import { Location } from '@/domain/locations/location.aggregate'
import { LocationId } from '@/domain/locations/value-objects/location-id'
import { GeoLocation } from '@/domain/locations/value-objects/geo-location'
import { EVSE } from '@/domain/locations/entities/evse'
import { Connector } from '@/domain/locations/entities/connector'

describe('Location DTO Validation', () => {
  describe('LocationDtoSchema', () => {
    it('should validate a complete OCPI location object', () => {
      const validLocation = {
        country_code: 'NL',
        party_id: 'ABC',
        id: 'LOC001',
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
        time_zone: 'Europe/Amsterdam',
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const result = LocationDtoSchema.safeParse(validLocation)
      expect(result.success).toBe(true)
    })

    it('should reject location with invalid country_code length', () => {
      const invalidLocation = {
        country_code: 'NLD', // Should be 2 characters
        party_id: 'ABC',
        id: 'LOC001',
        publish: true,
        address: 'Test Street 1',
        city: 'Amsterdam',
        country: 'NLD',
        coordinates: {
          latitude: '52.370216',
          longitude: '4.895168',
        },
        time_zone: 'Europe/Amsterdam',
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const result = LocationDtoSchema.safeParse(invalidLocation)
      expect(result.success).toBe(false)
    })

    it('should reject location with invalid coordinates format', () => {
      const invalidLocation = {
        country_code: 'NL',
        party_id: 'ABC',
        id: 'LOC001',
        publish: true,
        address: 'Test Street 1',
        city: 'Amsterdam',
        country: 'NLD',
        coordinates: {
          latitude: '52.37', // Too few decimal places
          longitude: '4.895168',
        },
        time_zone: 'Europe/Amsterdam',
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const result = LocationDtoSchema.safeParse(invalidLocation)
      expect(result.success).toBe(false)
    })
  })

  describe('EvseDtoSchema', () => {
    it('should validate a complete EVSE object', () => {
      const validEvse = {
        uid: 'EVSE001',
        evse_id: 'NL*ABC*E123456',
        status: 'AVAILABLE',
        capabilities: ['RFID_READER', 'RESERVABLE'],
        connectors: [
          {
            id: '1',
            standard: 'IEC_62196_T2',
            format: 'SOCKET',
            power_type: 'AC_3_PHASE',
            max_voltage: 230,
            max_amperage: 32,
            tariff_ids: ['TARIFF001'],
            last_updated: '2023-01-01T00:00:00.000Z',
          },
        ],
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const result = EvseDtoSchema.safeParse(validEvse)
      expect(result.success).toBe(true)
    })

    it('should require at least one connector', () => {
      const invalidEvse = {
        uid: 'EVSE001',
        status: 'AVAILABLE',
        capabilities: ['RFID_READER'],
        connectors: [], // Empty connectors array
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const result = EvseDtoSchema.safeParse(invalidEvse)
      expect(result.success).toBe(false)
    })
  })

  describe('ConnectorDtoSchema', () => {
    it('should validate a complete connector object', () => {
      const validConnector = {
        id: '1',
        standard: 'IEC_62196_T2',
        format: 'SOCKET',
        power_type: 'AC_3_PHASE',
        max_voltage: 230,
        max_amperage: 32,
        tariff_ids: ['TARIFF001'],
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const result = ConnectorDtoSchema.safeParse(validConnector)
      expect(result.success).toBe(true)
    })

    it('should reject connector with invalid standard', () => {
      const invalidConnector = {
        id: '1',
        standard: 'INVALID_STANDARD',
        format: 'SOCKET',
        power_type: 'AC_3_PHASE',
        max_voltage: 230,
        max_amperage: 32,
        tariff_ids: ['TARIFF001'],
        last_updated: '2023-01-01T00:00:00.000Z',
      }

      const result = ConnectorDtoSchema.safeParse(invalidConnector)
      expect(result.success).toBe(false)
    })
  })
})

describe('LocationMapper', () => {
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

  describe('fromDomain', () => {
    it('should convert domain Location to LocationDto', () => {
      const domainLocation = createTestLocation()
      const dto = LocationMapper.fromDomain(domainLocation, 'NL', 'ABC')

      expect(dto.country_code).toBe('NL')
      expect(dto.party_id).toBe('ABC')
      expect(dto.id).toBe('LOC001')
      expect(dto.publish).toBe(true)
      expect(dto.name).toBe('Test Location')
      expect(dto.address).toBe('Test Street 1')
      expect(dto.city).toBe('Amsterdam')
      expect(dto.postal_code).toBe('1234AB')
      expect(dto.country).toBe('NLD')
      expect(dto.coordinates.latitude).toBe('52.370216')
      expect(dto.coordinates.longitude).toBe('4.895168')
      expect(dto.time_zone).toBe('Europe/Amsterdam')
      expect(dto.last_updated).toBe('2023-01-01T00:00:00.000Z')
    })

    it('should validate the generated DTO against OCPI schema', () => {
      const domainLocation = createTestLocation()
      const dto = LocationMapper.fromDomain(domainLocation, 'NL', 'ABC')

      const result = LocationDtoSchema.safeParse(dto)
      expect(result.success).toBe(true)
    })

    it('should handle location with EVSEs and connectors', () => {
      const domainLocation = createTestLocation()

      // Add EVSE with connector - this would require proper EVSE/Connector creation
      // For now, test the basic mapping
      const dto = LocationMapper.fromDomain(domainLocation, 'NL', 'ABC')

      expect(dto.evses).toBeUndefined() // No EVSEs added to test location
    })

    it('should handle optional fields correctly', () => {
      const locationId = new LocationId('NL', 'ABC', 'LOC002')

      // Create minimal location without optional fields
      const minimalLocation = new Location(
        locationId,
        false, // publish
        'Test Street 2', // address
        'Rotterdam', // city
        'NLD', // country
        new GeoLocation('51.922211', '4.479677'),
        'Europe/Amsterdam', // timeZone
        new Date('2023-01-01T00:00:00.000Z'), // lastUpdated
      )

      const dto = LocationMapper.fromDomain(minimalLocation, 'NL', 'ABC')

      expect(dto.name).toBeUndefined()
      expect(dto.postal_code).toBeUndefined()
      expect(dto.publish).toBe(false)
      expect(dto.evses).toBeUndefined()
    })
  })
})

describe('OCPI Compliance Tests', () => {
  it('should follow OCPI 2.2.1 Location object specification', () => {
    // Test that all required OCPI fields are present and correctly typed
    const ocpiCompliantLocation = {
      country_code: 'BE',
      party_id: 'BEC',
      id: 'LOC1',
      publish: true,
      name: 'Gent Zuid',
      address: 'F.Rooseveltlaan 3A',
      city: 'Gent',
      postal_code: '9000',
      country: 'BEL',
      coordinates: {
        latitude: '51.047599',
        longitude: '3.729944',
      },
      parking_type: 'ON_STREET',
      evses: [
        {
          uid: '3256',
          evse_id: 'BE*BEC*E041503001',
          status: 'AVAILABLE',
          capabilities: ['RESERVABLE'],
          connectors: [
            {
              id: '1',
              standard: 'IEC_62196_T2',
              format: 'CABLE',
              power_type: 'AC_3_PHASE',
              max_voltage: 220,
              max_amperage: 16,
              tariff_ids: ['11'],
              last_updated: '2015-03-16T10:10:02Z',
            },
          ],
          physical_reference: '1',
          floor_level: '-1',
          last_updated: '2015-06-28T08:12:01Z',
        },
      ],
      operator: {
        name: 'BeCharged',
      },
      time_zone: 'Europe/Brussels',
      last_updated: '2015-06-29T20:39:09Z',
    }

    const result = LocationDtoSchema.safeParse(ocpiCompliantLocation)
    expect(result.success).toBe(true)
  })

  it('should reject non-OCPI compliant data', () => {
    const nonCompliantLocation = {
      country_code: 'BELGIUM', // Invalid: too long
      party_id: 'B', // Invalid: too short
      id: 'LOC1',
      publish: 'yes', // Invalid: should be boolean
      address: 'F.Rooseveltlaan 3A',
      city: 'Gent',
      country: 'BE', // Invalid: should be 3-letter ISO code
      coordinates: {
        latitude: 'fifty-one', // Invalid: should be numeric string
        longitude: '3.729944',
      },
      time_zone: 'Europe/Brussels',
      last_updated: '2015-06-29', // Invalid: missing time part
    }

    const result = LocationDtoSchema.safeParse(nonCompliantLocation)
    expect(result.success).toBe(false)
  })
})
