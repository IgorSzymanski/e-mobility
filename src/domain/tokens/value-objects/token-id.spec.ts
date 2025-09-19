import { TokenId } from './token-id'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

describe('TokenId', () => {
  describe('constructor', () => {
    it('should create a valid TokenId', () => {
      const tokenId = new TokenId('NL', 'TNM', '012345678')

      expect(tokenId.countryCode).toBe('NL')
      expect(tokenId.partyId).toBe('TNM')
      expect(tokenId.uid).toBe('012345678')
      expect(tokenId.value).toBe('NL*TNM*012345678')
    })

    it('should throw error for invalid country code length', () => {
      expect(() => new TokenId('N', 'TNM', '012345678')).toThrow(
        OcpiInvalidParametersException,
      )
      expect(() => new TokenId('NLD', 'TNM', '012345678')).toThrow(
        OcpiInvalidParametersException,
      )
    })

    it('should throw error for invalid party ID length', () => {
      expect(() => new TokenId('NL', 'TN', '012345678')).toThrow(
        OcpiInvalidParametersException,
      )
      expect(() => new TokenId('NL', 'TNMX', '012345678')).toThrow(
        OcpiInvalidParametersException,
      )
    })

    it('should throw error for empty or too long UID', () => {
      expect(() => new TokenId('NL', 'TNM', '')).toThrow(
        OcpiInvalidParametersException,
      )
      expect(() => new TokenId('NL', 'TNM', 'a'.repeat(37))).toThrow(
        OcpiInvalidParametersException,
      )
    })
  })

  describe('fromString', () => {
    it('should create TokenId from valid OCPI string format', () => {
      const tokenId = TokenId.fromString('NL*TNM*012345678')

      expect(tokenId.countryCode).toBe('NL')
      expect(tokenId.partyId).toBe('TNM')
      expect(tokenId.uid).toBe('012345678')
      expect(tokenId.value).toBe('NL*TNM*012345678')
    })

    it('should throw error for invalid string format', () => {
      expect(() => TokenId.fromString('NL-TNM-012345678')).toThrow(
        OcpiInvalidParametersException,
      )
      expect(() => TokenId.fromString('NL*TNM')).toThrow(
        OcpiInvalidParametersException,
      )
      expect(() => TokenId.fromString('NL*TNM*012345678*EXTRA')).toThrow(
        OcpiInvalidParametersException,
      )
    })

    it('should validate parts after splitting', () => {
      expect(() => TokenId.fromString('N*TNM*012345678')).toThrow(
        OcpiInvalidParametersException,
      )
      expect(() => TokenId.fromString('NL*TN*012345678')).toThrow(
        OcpiInvalidParametersException,
      )
    })
  })

  describe('equals', () => {
    it('should return true for equal TokenIds', () => {
      const tokenId1 = new TokenId('NL', 'TNM', '012345678')
      const tokenId2 = new TokenId('NL', 'TNM', '012345678')

      expect(tokenId1.equals(tokenId2)).toBe(true)
    })

    it('should return false for different TokenIds', () => {
      const tokenId1 = new TokenId('NL', 'TNM', '012345678')
      const tokenId2 = new TokenId('NL', 'TNM', '012345679')
      const tokenId3 = new TokenId('DE', 'TNM', '012345678')

      expect(tokenId1.equals(tokenId2)).toBe(false)
      expect(tokenId1.equals(tokenId3)).toBe(false)
    })
  })
})
