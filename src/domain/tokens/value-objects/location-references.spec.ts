import { LocationReferences } from './location-references'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

describe('LocationReferences', () => {
  describe('constructor', () => {
    it('should create LocationReferences with location ID only', () => {
      const locationRef = new LocationReferences('LOC001')

      expect(locationRef.locationId).toBe('LOC001')
      expect(locationRef.evseUids).toEqual([])
    })

    it('should create LocationReferences with location ID and EVSE UIDs', () => {
      const evseUids = ['EVSE001', 'EVSE002', 'EVSE003']
      const locationRef = new LocationReferences('LOC001', evseUids)

      expect(locationRef.locationId).toBe('LOC001')
      expect(locationRef.evseUids).toEqual(evseUids)
    })

    it('should throw error for empty location ID', () => {
      expect(() => new LocationReferences('')).toThrow(
        OcpiInvalidParametersException,
      )
      expect(() => new LocationReferences('   ')).toThrow(
        OcpiInvalidParametersException,
      )
    })

    it('should throw error for location ID too long', () => {
      expect(() => new LocationReferences('a'.repeat(37))).toThrow(
        OcpiInvalidParametersException,
      )
    })

    it('should throw error for empty EVSE UIDs in array', () => {
      expect(() => new LocationReferences('LOC001', ['EVSE001', '', 'EVSE003'])).toThrow(
        OcpiInvalidParametersException,
      )
    })

    it('should throw error for EVSE UID too long', () => {
      expect(() => new LocationReferences('LOC001', ['EVSE001', 'a'.repeat(37)])).toThrow(
        OcpiInvalidParametersException,
      )
    })
  })

  describe('hasEvseRestrictions', () => {
    it('should return false when no EVSE UIDs specified', () => {
      const locationRef = new LocationReferences('LOC001')
      expect(locationRef.hasEvseRestrictions()).toBe(false)
    })

    it('should return false when empty EVSE UIDs array', () => {
      const locationRef = new LocationReferences('LOC001', [])
      expect(locationRef.hasEvseRestrictions()).toBe(false)
    })

    it('should return true when EVSE UIDs specified', () => {
      const locationRef = new LocationReferences('LOC001', ['EVSE001'])
      expect(locationRef.hasEvseRestrictions()).toBe(true)
    })
  })

  describe('isEvseAllowed', () => {
    it('should return true when no EVSE restrictions', () => {
      const locationRef = new LocationReferences('LOC001')
      expect(locationRef.isEvseAllowed('EVSE001')).toBe(true)
      expect(locationRef.isEvseAllowed('EVSE999')).toBe(true)
    })

    it('should return true for allowed EVSE when restrictions exist', () => {
      const locationRef = new LocationReferences('LOC001', ['EVSE001', 'EVSE002'])
      expect(locationRef.isEvseAllowed('EVSE001')).toBe(true)
      expect(locationRef.isEvseAllowed('EVSE002')).toBe(true)
    })

    it('should return false for non-allowed EVSE when restrictions exist', () => {
      const locationRef = new LocationReferences('LOC001', ['EVSE001', 'EVSE002'])
      expect(locationRef.isEvseAllowed('EVSE003')).toBe(false)
      expect(locationRef.isEvseAllowed('EVSE999')).toBe(false)
    })
  })

  describe('filterEvses', () => {
    it('should return all EVSEs when no restrictions', () => {
      const locationRef = new LocationReferences('LOC001')
      const allEvses = ['EVSE001', 'EVSE002', 'EVSE003']

      expect(locationRef.filterEvses(allEvses)).toEqual(allEvses)
    })

    it('should filter EVSEs based on restrictions', () => {
      const locationRef = new LocationReferences('LOC001', ['EVSE001', 'EVSE003'])
      const allEvses = ['EVSE001', 'EVSE002', 'EVSE003', 'EVSE004']

      expect(locationRef.filterEvses(allEvses)).toEqual(['EVSE001', 'EVSE003'])
    })

    it('should return empty array when no EVSEs match restrictions', () => {
      const locationRef = new LocationReferences('LOC001', ['EVSE999'])
      const allEvses = ['EVSE001', 'EVSE002', 'EVSE003']

      expect(locationRef.filterEvses(allEvses)).toEqual([])
    })
  })

  describe('equals', () => {
    it('should return true for equal LocationReferences', () => {
      const locationRef1 = new LocationReferences('LOC001', ['EVSE001', 'EVSE002'])
      const locationRef2 = new LocationReferences('LOC001', ['EVSE001', 'EVSE002'])

      expect(locationRef1.equals(locationRef2)).toBe(true)
    })

    it('should return false for different location IDs', () => {
      const locationRef1 = new LocationReferences('LOC001', ['EVSE001'])
      const locationRef2 = new LocationReferences('LOC002', ['EVSE001'])

      expect(locationRef1.equals(locationRef2)).toBe(false)
    })

    it('should return false for different EVSE UIDs', () => {
      const locationRef1 = new LocationReferences('LOC001', ['EVSE001'])
      const locationRef2 = new LocationReferences('LOC001', ['EVSE002'])

      expect(locationRef1.equals(locationRef2)).toBe(false)
    })

    it('should return false for different EVSE UID array lengths', () => {
      const locationRef1 = new LocationReferences('LOC001', ['EVSE001'])
      const locationRef2 = new LocationReferences('LOC001', ['EVSE001', 'EVSE002'])

      expect(locationRef1.equals(locationRef2)).toBe(false)
    })
  })
})