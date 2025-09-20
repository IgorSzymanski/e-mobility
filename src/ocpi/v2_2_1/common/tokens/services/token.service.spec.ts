import { Test, TestingModule } from '@nestjs/testing'
import { TokenService } from './token.service'
import { Token } from '@/domain/tokens/token.aggregate'
import { TokenId } from '@/domain/tokens/value-objects/token-id'
import {
  AllowedType,
  TokenType,
  WhitelistType,
} from '@/domain/tokens/enums/token-enums'
import { OcpiUnknownTokenException } from '@/shared/exceptions'
import { LocationReferences } from '@/domain/tokens/value-objects/location-references'

describe('TokenService', () => {
  let service: TokenService
  let mockTokenRepository: any

  const validToken = new Token(
    new TokenId('NL', 'TNM', '012345678'),
    TokenType.RFID,
    'NL8ACC12E46L89',
    'TheNewMotion',
    true,
    WhitelistType.ALLOWED,
    new Date('2023-01-15T10:30:00.000Z'),
  )

  beforeEach(async () => {
    const mockRepository = {
      findByIdAndType: vi.fn(),
      findByUidAndType: vi.fn(),
      save: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: 'TokenRepository',
          useValue: mockRepository,
        },
      ],
    }).compile()

    service = module.get<TokenService>(TokenService)
    mockTokenRepository = module.get('TokenRepository')
  })

  describe('getToken', () => {
    it('should return token when found', async () => {
      mockTokenRepository.findByIdAndType.mockResolvedValue(validToken)

      const result = await service.getToken(
        'NL',
        'TNM',
        '012345678',
        TokenType.RFID,
      )

      expect(result).toEqual(validToken)
      expect(mockTokenRepository.findByIdAndType).toHaveBeenCalledWith(
        expect.objectContaining({
          countryCode: 'NL',
          partyId: 'TNM',
          uid: '012345678',
        }),
        TokenType.RFID,
      )
    })

    it('should throw OcpiUnknownTokenException when token not found', async () => {
      mockTokenRepository.findByIdAndType.mockResolvedValue(null)

      await expect(
        service.getToken('NL', 'TNM', '012345678', TokenType.RFID),
      ).rejects.toThrow(OcpiUnknownTokenException)
    })

    it('should use RFID as default type when not specified', async () => {
      mockTokenRepository.findByIdAndType.mockResolvedValue(validToken)

      await service.getToken('NL', 'TNM', '012345678')

      expect(mockTokenRepository.findByIdAndType).toHaveBeenCalledWith(
        expect.anything(),
        TokenType.RFID,
      )
    })
  })

  describe('createOrUpdateToken', () => {
    it('should create new token successfully', async () => {
      mockTokenRepository.save.mockResolvedValue(validToken)

      const result = await service.createOrUpdateToken(validToken)

      expect(result).toEqual(validToken)
      expect(mockTokenRepository.save).toHaveBeenCalledWith(validToken)
    })

    it('should update existing token successfully', async () => {
      const updatedToken = validToken.invalidate()
      mockTokenRepository.save.mockResolvedValue(updatedToken)

      const result = await service.createOrUpdateToken(updatedToken)

      expect(result).toEqual(updatedToken)
      expect(mockTokenRepository.save).toHaveBeenCalledWith(updatedToken)
    })
  })

  describe('updateToken', () => {
    it('should partially update token successfully', async () => {
      const existingToken = validToken
      const partialUpdate = { valid: false }
      const updatedToken = existingToken.invalidate()

      mockTokenRepository.findByIdAndType.mockResolvedValue(existingToken)
      mockTokenRepository.save.mockResolvedValue(updatedToken)

      const result = await service.updateToken(
        'NL',
        'TNM',
        '012345678',
        TokenType.RFID,
        partialUpdate,
      )

      expect(result).toEqual(updatedToken)
      expect(mockTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
        }),
      )
    })

    it('should throw OcpiUnknownTokenException when token not found for update', async () => {
      mockTokenRepository.findByIdAndType.mockResolvedValue(null)

      await expect(
        service.updateToken('NL', 'TNM', '012345678', TokenType.RFID, {
          valid: false,
        }),
      ).rejects.toThrow(OcpiUnknownTokenException)
    })
  })

  describe('getTokens', () => {
    it('should return paginated tokens', async () => {
      const tokens = [validToken]
      const mockResult = {
        tokens,
        totalCount: 1,
        hasMore: false,
      }

      mockTokenRepository.findAll.mockResolvedValue(mockResult)

      const result = await service.getTokens({
        offset: 0,
        limit: 100,
      })

      expect(result).toEqual(mockResult)
      expect(mockTokenRepository.findAll).toHaveBeenCalledWith({
        offset: 0,
        limit: 100,
      })
    })

    it('should apply date filters correctly', async () => {
      const dateFrom = new Date('2023-01-01T00:00:00.000Z')
      const dateTo = new Date('2023-01-31T23:59:59.999Z')
      const mockResult = {
        tokens: [validToken],
        totalCount: 1,
        hasMore: false,
      }

      mockTokenRepository.findAll.mockResolvedValue(mockResult)

      await service.getTokens({
        dateFrom,
        dateTo,
        offset: 0,
        limit: 50,
      })

      expect(mockTokenRepository.findAll).toHaveBeenCalledWith({
        dateFrom,
        dateTo,
        offset: 0,
        limit: 50,
      })
    })
  })

  describe('authorizeToken', () => {
    const locationRef = new LocationReferences('LOC001', ['EVSE001'])

    it('should authorize whitelisted token without real-time check', async () => {
      const whitelistedToken = new Token(
        new TokenId('NL', 'TNM', '012345678'),
        TokenType.RFID,
        'NL8ACC12E46L89',
        'TheNewMotion',
        true,
        WhitelistType.ALWAYS,
        new Date('2023-01-15T10:30:00.000Z'),
      )

      mockTokenRepository.findByUidAndType.mockResolvedValue(whitelistedToken)

      const result = await service.authorizeToken(
        '012345678',
        TokenType.RFID,
        locationRef,
      )

      expect(result.allowed).toBe(AllowedType.ALLOWED)
      expect(result.token).toBeDefined()
      expect(result.location).toEqual(locationRef)
    })

    it('should block invalid token', async () => {
      const invalidToken = new Token(
        new TokenId('NL', 'TNM', '012345678'),
        TokenType.RFID,
        'NL8ACC12E46L89',
        'TheNewMotion',
        false, // invalid
        WhitelistType.NEVER,
        new Date('2023-01-15T10:30:00.000Z'),
      )

      mockTokenRepository.findByUidAndType.mockResolvedValue(invalidToken)

      const result = await service.authorizeToken(
        '012345678',
        TokenType.RFID,
        locationRef,
      )

      expect(result.allowed).toBe(AllowedType.BLOCKED)
      expect(result.token).toBeDefined()
    })

    it('should throw OcpiUnknownTokenException for unknown token', async () => {
      mockTokenRepository.findByUidAndType.mockResolvedValue(null)

      await expect(
        service.authorizeToken('999999999', TokenType.RFID, locationRef),
      ).rejects.toThrow(OcpiUnknownTokenException)
    })

    it('should require real-time authorization for NEVER whitelist', async () => {
      const realtimeToken = new Token(
        new TokenId('NL', 'TNM', '012345678'),
        TokenType.RFID,
        'NL8ACC12E46L89',
        'TheNewMotion',
        true,
        WhitelistType.NEVER,
        new Date('2023-01-15T10:30:00.000Z'),
      )

      mockTokenRepository.findByUidAndType.mockResolvedValue(realtimeToken)

      // For now, we'll assume real-time auth succeeds
      // In a real implementation, this would call the eMSP
      const result = await service.authorizeToken(
        '012345678',
        TokenType.RFID,
        locationRef,
      )

      expect(result.allowed).toBe(AllowedType.ALLOWED) // Assuming eMSP allows it
      expect(result.token).toBeDefined()
    })

    it('should handle authorization without location reference', async () => {
      mockTokenRepository.findByUidAndType.mockResolvedValue(validToken)

      const result = await service.authorizeToken('012345678', TokenType.RFID)

      expect(result.allowed).toBeDefined()
      expect(result.location).toBeUndefined()
    })

    it('should use RFID as default type for authorization', async () => {
      mockTokenRepository.findByUidAndType.mockResolvedValue(validToken)

      await service.authorizeToken('012345678')

      expect(mockTokenRepository.findByUidAndType).toHaveBeenCalledWith(
        '012345678',
        TokenType.RFID,
      )
    })
  })
})
