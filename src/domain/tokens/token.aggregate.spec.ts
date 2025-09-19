import { Token } from './token.aggregate'
import { TokenId } from './value-objects/token-id'
import { TokenType, WhitelistType } from './enums/token-enums'
import { OcpiInvalidParametersException } from '../../shared/exceptions/ocpi.exceptions'

describe('Token', () => {
  const validTokenData = {
    id: new TokenId('NL', 'TNM', '012345678'),
    type: TokenType.RFID,
    contractId: 'NL8ACC12E46L89',
    issuer: 'TheNewMotion',
    valid: true,
    whitelist: WhitelistType.ALLOWED,
    lastUpdated: new Date('2023-01-15T10:30:00.000Z'),
  }

  describe('constructor', () => {
    it('should create a valid Token with minimal data', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        validTokenData.whitelist,
        validTokenData.lastUpdated,
      )

      expect(token.id).toEqual(validTokenData.id)
      expect(token.type).toBe(validTokenData.type)
      expect(token.contractId).toBe(validTokenData.contractId)
      expect(token.issuer).toBe(validTokenData.issuer)
      expect(token.valid).toBe(validTokenData.valid)
      expect(token.whitelist).toBe(validTokenData.whitelist)
      expect(token.lastUpdated).toEqual(validTokenData.lastUpdated)
    })

    it('should create a valid Token with optional data', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        validTokenData.whitelist,
        validTokenData.lastUpdated,
        'DF000-2001-8999-1', // visual_number
        'DF000-2001-8999', // group_id
        'en', // language
      )

      expect(token.visualNumber).toBe('DF000-2001-8999-1')
      expect(token.groupId).toBe('DF000-2001-8999')
      expect(token.language).toBe('en')
    })

    it('should throw error for empty contract ID', () => {
      expect(
        () =>
          new Token(
            validTokenData.id,
            validTokenData.type,
            '',
            validTokenData.issuer,
            validTokenData.valid,
            validTokenData.whitelist,
            validTokenData.lastUpdated,
          ),
      ).toThrow(OcpiInvalidParametersException)
    })

    it('should throw error for empty issuer', () => {
      expect(
        () =>
          new Token(
            validTokenData.id,
            validTokenData.type,
            validTokenData.contractId,
            '',
            validTokenData.valid,
            validTokenData.whitelist,
            validTokenData.lastUpdated,
          ),
      ).toThrow(OcpiInvalidParametersException)
    })

    it('should throw error for contract ID too long', () => {
      expect(
        () =>
          new Token(
            validTokenData.id,
            validTokenData.type,
            'a'.repeat(37),
            validTokenData.issuer,
            validTokenData.valid,
            validTokenData.whitelist,
            validTokenData.lastUpdated,
          ),
      ).toThrow(OcpiInvalidParametersException)
    })

    it('should throw error for issuer too long', () => {
      expect(
        () =>
          new Token(
            validTokenData.id,
            validTokenData.type,
            validTokenData.contractId,
            'a'.repeat(65),
            validTokenData.valid,
            validTokenData.whitelist,
            validTokenData.lastUpdated,
          ),
      ).toThrow(OcpiInvalidParametersException)
    })

    it('should throw error for visual number too long', () => {
      expect(
        () =>
          new Token(
            validTokenData.id,
            validTokenData.type,
            validTokenData.contractId,
            validTokenData.issuer,
            validTokenData.valid,
            validTokenData.whitelist,
            validTokenData.lastUpdated,
            'a'.repeat(65),
          ),
      ).toThrow(OcpiInvalidParametersException)
    })

    it('should throw error for group ID too long', () => {
      expect(
        () =>
          new Token(
            validTokenData.id,
            validTokenData.type,
            validTokenData.contractId,
            validTokenData.issuer,
            validTokenData.valid,
            validTokenData.whitelist,
            validTokenData.lastUpdated,
            undefined,
            'a'.repeat(37),
          ),
      ).toThrow(OcpiInvalidParametersException)
    })

    it('should throw error for invalid language code', () => {
      expect(
        () =>
          new Token(
            validTokenData.id,
            validTokenData.type,
            validTokenData.contractId,
            validTokenData.issuer,
            validTokenData.valid,
            validTokenData.whitelist,
            validTokenData.lastUpdated,
            undefined,
            undefined,
            'english',
          ),
      ).toThrow(OcpiInvalidParametersException)
    })
  })

  describe('invalidate', () => {
    it('should create new token with valid=false', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        validTokenData.whitelist,
        validTokenData.lastUpdated,
      )

      const invalidatedToken = token.invalidate()

      expect(invalidatedToken.valid).toBe(false)
      expect(invalidatedToken.lastUpdated.getTime()).toBeGreaterThan(
        validTokenData.lastUpdated.getTime(),
      )
      expect(invalidatedToken.id).toEqual(token.id)
      expect(invalidatedToken.type).toBe(token.type)
    })

    it('should update lastUpdated timestamp', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        validTokenData.whitelist,
        validTokenData.lastUpdated,
      )

      const beforeTime = Date.now()
      const invalidatedToken = token.invalidate()
      const afterTime = Date.now()

      expect(invalidatedToken.lastUpdated.getTime()).toBeGreaterThanOrEqual(
        beforeTime,
      )
      expect(invalidatedToken.lastUpdated.getTime()).toBeLessThanOrEqual(
        afterTime,
      )
    })
  })

  describe('updateWhitelist', () => {
    it('should create new token with updated whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALWAYS,
        validTokenData.lastUpdated,
      )

      const updatedToken = token.updateWhitelist(WhitelistType.NEVER)

      expect(updatedToken.whitelist).toBe(WhitelistType.NEVER)
      expect(updatedToken.lastUpdated.getTime()).toBeGreaterThan(
        validTokenData.lastUpdated.getTime(),
      )
    })
  })

  describe('isWhitelisted', () => {
    it('should return true for ALWAYS whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALWAYS,
        validTokenData.lastUpdated,
      )

      expect(token.isWhitelisted()).toBe(true)
    })

    it('should return false for NEVER whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.NEVER,
        validTokenData.lastUpdated,
      )

      expect(token.isWhitelisted()).toBe(false)
    })

    it('should return false for ALLOWED whitelist (requires real-time auth)', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALLOWED,
        validTokenData.lastUpdated,
      )

      expect(token.isWhitelisted()).toBe(false)
    })

    it('should return false for ALLOWED_OFFLINE whitelist (prefers real-time)', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALLOWED_OFFLINE,
        validTokenData.lastUpdated,
      )

      expect(token.isWhitelisted()).toBe(false)
    })
  })

  describe('requiresRealtimeAuth', () => {
    it('should return false for ALWAYS whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALWAYS,
        validTokenData.lastUpdated,
      )

      expect(token.requiresRealtimeAuth()).toBe(false)
    })

    it('should return true for NEVER whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.NEVER,
        validTokenData.lastUpdated,
      )

      expect(token.requiresRealtimeAuth()).toBe(true)
    })

    it('should return true for ALLOWED whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALLOWED,
        validTokenData.lastUpdated,
      )

      expect(token.requiresRealtimeAuth()).toBe(true)
    })

    it('should return true for ALLOWED_OFFLINE whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALLOWED_OFFLINE,
        validTokenData.lastUpdated,
      )

      expect(token.requiresRealtimeAuth()).toBe(true)
    })
  })

  describe('canBeUsedOffline', () => {
    it('should return true for ALWAYS whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALWAYS,
        validTokenData.lastUpdated,
      )

      expect(token.canBeUsedOffline()).toBe(true)
    })

    it('should return true for ALLOWED_OFFLINE whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALLOWED_OFFLINE,
        validTokenData.lastUpdated,
      )

      expect(token.canBeUsedOffline()).toBe(true)
    })

    it('should return false for NEVER whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.NEVER,
        validTokenData.lastUpdated,
      )

      expect(token.canBeUsedOffline()).toBe(false)
    })

    it('should return false for ALLOWED whitelist', () => {
      const token = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        WhitelistType.ALLOWED,
        validTokenData.lastUpdated,
      )

      expect(token.canBeUsedOffline()).toBe(false)
    })
  })

  describe('equals', () => {
    it('should return true for tokens with same ID', () => {
      const token1 = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        validTokenData.whitelist,
        validTokenData.lastUpdated,
      )

      const token2 = new Token(
        validTokenData.id,
        TokenType.APP_USER, // Different type
        'DIFFERENT_CONTRACT',
        'Different Issuer',
        false,
        WhitelistType.NEVER,
        new Date(),
      )

      expect(token1.equals(token2)).toBe(true)
    })

    it('should return false for tokens with different IDs', () => {
      const token1 = new Token(
        validTokenData.id,
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        validTokenData.whitelist,
        validTokenData.lastUpdated,
      )

      const token2 = new Token(
        new TokenId('DE', 'ABC', '987654321'),
        validTokenData.type,
        validTokenData.contractId,
        validTokenData.issuer,
        validTokenData.valid,
        validTokenData.whitelist,
        validTokenData.lastUpdated,
      )

      expect(token1.equals(token2)).toBe(false)
    })
  })
})
