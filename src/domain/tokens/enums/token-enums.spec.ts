import { AllowedType, TokenType, WhitelistType } from './token-enums'

describe('Token Enums', () => {
  describe('AllowedType', () => {
    it('should have correct OCPI 2.2.1 values', () => {
      expect(AllowedType.ALLOWED).toBe('ALLOWED')
      expect(AllowedType.BLOCKED).toBe('BLOCKED')
      expect(AllowedType.EXPIRED).toBe('EXPIRED')
      expect(AllowedType.NO_CREDIT).toBe('NO_CREDIT')
      expect(AllowedType.NOT_ALLOWED).toBe('NOT_ALLOWED')
    })

    it('should have all required values', () => {
      const expectedValues = ['ALLOWED', 'BLOCKED', 'EXPIRED', 'NO_CREDIT', 'NOT_ALLOWED']
      const actualValues = Object.values(AllowedType)

      expect(actualValues).toEqual(expect.arrayContaining(expectedValues))
      expect(actualValues).toHaveLength(expectedValues.length)
    })
  })

  describe('TokenType', () => {
    it('should have correct OCPI 2.2.1 values', () => {
      expect(TokenType.AD_HOC_USER).toBe('AD_HOC_USER')
      expect(TokenType.APP_USER).toBe('APP_USER')
      expect(TokenType.OTHER).toBe('OTHER')
      expect(TokenType.RFID).toBe('RFID')
    })

    it('should have all required values', () => {
      const expectedValues = ['AD_HOC_USER', 'APP_USER', 'OTHER', 'RFID']
      const actualValues = Object.values(TokenType)

      expect(actualValues).toEqual(expect.arrayContaining(expectedValues))
      expect(actualValues).toHaveLength(expectedValues.length)
    })
  })

  describe('WhitelistType', () => {
    it('should have correct OCPI 2.2.1 values', () => {
      expect(WhitelistType.ALWAYS).toBe('ALWAYS')
      expect(WhitelistType.ALLOWED).toBe('ALLOWED')
      expect(WhitelistType.ALLOWED_OFFLINE).toBe('ALLOWED_OFFLINE')
      expect(WhitelistType.NEVER).toBe('NEVER')
    })

    it('should have all required values', () => {
      const expectedValues = ['ALWAYS', 'ALLOWED', 'ALLOWED_OFFLINE', 'NEVER']
      const actualValues = Object.values(WhitelistType)

      expect(actualValues).toEqual(expect.arrayContaining(expectedValues))
      expect(actualValues).toHaveLength(expectedValues.length)
    })
  })
})