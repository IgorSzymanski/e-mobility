import { AuthorizationInfo } from './authorization-info'
import { TokenId } from './token-id'
import { LocationReferences } from './location-references'
import { AllowedType, TokenType, WhitelistType } from '../enums/token-enums'
import { OcpiInvalidParametersException } from '../../../shared/exceptions/ocpi.exceptions'

describe('AuthorizationInfo', () => {
  const mockToken = {
    id: new TokenId('NL', 'TNM', '012345678'),
    type: TokenType.RFID,
    contractId: 'NL8ACC12E46L89',
    issuer: 'TheNewMotion',
    valid: true,
    whitelist: WhitelistType.ALLOWED,
    lastUpdated: new Date('2023-01-15T10:30:00.000Z'),
  }

  describe('constructor', () => {
    it('should create AuthorizationInfo with minimal required data', () => {
      const authInfo = new AuthorizationInfo(AllowedType.ALLOWED, mockToken)

      expect(authInfo.allowed).toBe(AllowedType.ALLOWED)
      expect(authInfo.token).toEqual(mockToken)
      expect(authInfo.location).toBeUndefined()
      expect(authInfo.authorizationReference).toBeUndefined()
      expect(authInfo.info).toBeUndefined()
    })

    it('should create AuthorizationInfo with complete data', () => {
      const location = new LocationReferences('LOC001', ['EVSE001', 'EVSE002'])
      const displayText = {
        language: 'en',
        text: 'Welcome! You have sufficient credit.',
      }

      const authInfo = new AuthorizationInfo(
        AllowedType.ALLOWED,
        mockToken,
        location,
        'AUTH123456',
        displayText,
      )

      expect(authInfo.allowed).toBe(AllowedType.ALLOWED)
      expect(authInfo.token).toEqual(mockToken)
      expect(authInfo.location).toEqual(location)
      expect(authInfo.authorizationReference).toBe('AUTH123456')
      expect(authInfo.info).toEqual(displayText)
    })

    it('should throw error for invalid authorization reference', () => {
      expect(
        () =>
          new AuthorizationInfo(AllowedType.ALLOWED, mockToken, undefined, ''),
      ).toThrow(OcpiInvalidParametersException)

      expect(
        () =>
          new AuthorizationInfo(
            AllowedType.ALLOWED,
            mockToken,
            undefined,
            'a'.repeat(37),
          ),
      ).toThrow(OcpiInvalidParametersException)
    })

    it('should throw error for invalid display text', () => {
      expect(
        () =>
          new AuthorizationInfo(
            AllowedType.ALLOWED,
            mockToken,
            undefined,
            undefined,
            { language: '', text: 'Valid text' },
          ),
      ).toThrow(OcpiInvalidParametersException)

      expect(
        () =>
          new AuthorizationInfo(
            AllowedType.ALLOWED,
            mockToken,
            undefined,
            undefined,
            { language: 'en', text: '' },
          ),
      ).toThrow(OcpiInvalidParametersException)
    })
  })

  describe('isAllowed', () => {
    it('should return true when allowed', () => {
      const authInfo = new AuthorizationInfo(AllowedType.ALLOWED, mockToken)
      expect(authInfo.isAllowed()).toBe(true)
    })

    it('should return false when blocked', () => {
      const authInfo = new AuthorizationInfo(AllowedType.BLOCKED, mockToken)
      expect(authInfo.isAllowed()).toBe(false)
    })

    it('should return false when expired', () => {
      const authInfo = new AuthorizationInfo(AllowedType.EXPIRED, mockToken)
      expect(authInfo.isAllowed()).toBe(false)
    })

    it('should return false when no credit', () => {
      const authInfo = new AuthorizationInfo(AllowedType.NO_CREDIT, mockToken)
      expect(authInfo.isAllowed()).toBe(false)
    })

    it('should return false when not allowed', () => {
      const authInfo = new AuthorizationInfo(AllowedType.NOT_ALLOWED, mockToken)
      expect(authInfo.isAllowed()).toBe(false)
    })
  })
})
