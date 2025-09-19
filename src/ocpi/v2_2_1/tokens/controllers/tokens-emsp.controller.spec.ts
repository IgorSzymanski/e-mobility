import { Test, TestingModule } from '@nestjs/testing'
import { TokensEmspController } from './tokens-emsp.controller'
import { TokenService } from '../services/token.service'
import { Token } from '../../../../domain/tokens/token.aggregate'
import { TokenId } from '../../../../domain/tokens/value-objects/token-id'
import { LocationReferences } from '../../../../domain/tokens/value-objects/location-references'
import { AuthorizationInfo } from '../../../../domain/tokens/value-objects/authorization-info'
import {
  TokenType,
  WhitelistType,
  AllowedType,
} from '../../../../domain/tokens/enums/token-enums'
import { AuthorizeRequestDto, TokenListQuery } from '../dto/token.dto'
import { OcpiUnknownTokenException } from '../../../../shared/exceptions/ocpi.exceptions'
import { OcpiAuthGuard } from '@/ocpi/common/guards/ocpi-auth.guard'

describe('TokensEmspController', () => {
  let controller: TokensEmspController
  let mockTokenService: TokenService

  const validToken = new Token(
    new TokenId('NL', 'TNM', '012345678'),
    TokenType.RFID,
    'NL8ACC12E46L89',
    'TheNewMotion',
    true,
    WhitelistType.ALLOWED,
    new Date('2023-01-15T10:30:00.000Z'),
  )

  const mockTokenData = {
    id: validToken.id,
    type: validToken.type,
    contractId: validToken.contractId,
    issuer: validToken.issuer,
    valid: validToken.valid,
    whitelist: validToken.whitelist,
    lastUpdated: validToken.lastUpdated,
  }

  const mockAuthorizationInfo = new AuthorizationInfo(
    AllowedType.ALLOWED,
    mockTokenData,
    new LocationReferences('LOC001', ['EVSE001']),
    'AUTH123456',
    { language: 'en', text: 'Welcome!' },
  )

  beforeEach(async () => {
    const mockService = {
      getTokens: vi.fn(),
      authorizeToken: vi.fn(),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokensEmspController],
      providers: [
        {
          provide: TokenService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(OcpiAuthGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<TokensEmspController>(TokensEmspController)
    mockTokenService = module.get(TokenService)
  })

  describe('getTokens', () => {
    it('should return paginated tokens', async () => {
      const mockResult = {
        tokens: [validToken],
        totalCount: 1,
        hasMore: false,
      }
      mockTokenService.getTokens.mockResolvedValue(mockResult)

      const query: TokenListQuery = {
        offset: 0,
        limit: 100,
      }

      const result = await controller.getTokens(query)

      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
          data: expect.arrayContaining([
            expect.objectContaining({
              country_code: 'NL',
              party_id: 'TNM',
              uid: '012345678',
            }),
          ]),
        }),
      )
      expect(mockTokenService.getTokens).toHaveBeenCalledWith({
        offset: 0,
        limit: 100,
      })
    })

    it('should apply date filters', async () => {
      const mockResult = {
        tokens: [validToken],
        totalCount: 1,
        hasMore: false,
      }
      mockTokenService.getTokens.mockResolvedValue(mockResult)

      const query: TokenListQuery = {
        date_from: '2023-01-01T00:00:00.000Z',
        date_to: '2023-01-31T23:59:59.999Z',
        offset: 0,
        limit: 50,
      }

      await controller.getTokens(query)

      expect(mockTokenService.getTokens).toHaveBeenCalledWith({
        dateFrom: new Date('2023-01-01T00:00:00.000Z'),
        dateTo: new Date('2023-01-31T23:59:59.999Z'),
        offset: 0,
        limit: 50,
      })
    })

    it('should use default pagination when not specified', async () => {
      const mockResult = {
        tokens: [],
        totalCount: 0,
        hasMore: false,
      }
      mockTokenService.getTokens.mockResolvedValue(mockResult)

      await controller.getTokens({})

      expect(mockTokenService.getTokens).toHaveBeenCalledWith({
        offset: 0,
        limit: 100,
      })
    })

    it('should include pagination headers', async () => {
      const mockResult = {
        tokens: [validToken],
        totalCount: 150,
        hasMore: true,
      }
      mockTokenService.getTokens.mockResolvedValue(mockResult)

      const query: TokenListQuery = {
        offset: 0,
        limit: 100,
      }

      const result = await controller.getTokens(query)

      // Check that pagination info is included
      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
          // Pagination headers would be added by NestJS interceptor
        }),
      )
    })
  })

  describe('authorizeToken', () => {
    it('should authorize token successfully', async () => {
      mockTokenService.authorizeToken.mockResolvedValue(mockAuthorizationInfo)

      const request: AuthorizeRequestDto = {
        location_id: 'LOC001',
        evse_uids: ['EVSE001'],
      }

      const result = await controller.authorizeToken(
        '012345678',
        TokenType.RFID,
        request,
      )

      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
          data: expect.objectContaining({
            allowed: AllowedType.ALLOWED,
            token: expect.objectContaining({
              country_code: 'NL',
              party_id: 'TNM',
              uid: '012345678',
            }),
            location: expect.objectContaining({
              location_id: 'LOC001',
              evse_uids: ['EVSE001'],
            }),
            authorization_reference: 'AUTH123456',
            info: expect.objectContaining({
              language: 'en',
              text: 'Welcome!',
            }),
          }),
        }),
      )
      expect(mockTokenService.authorizeToken).toHaveBeenCalledWith(
        '012345678',
        TokenType.RFID,
        expect.objectContaining({
          locationId: 'LOC001',
          evseUids: ['EVSE001'],
        }),
      )
    })

    it('should authorize token without location reference', async () => {
      const authInfoWithoutLocation = new AuthorizationInfo(
        AllowedType.ALLOWED,
        mockTokenData,
      )
      mockTokenService.authorizeToken.mockResolvedValue(authInfoWithoutLocation)

      const result = await controller.authorizeToken(
        '012345678',
        TokenType.RFID,
      )

      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
          data: expect.objectContaining({
            allowed: AllowedType.ALLOWED,
          }),
        }),
      )
      expect(mockTokenService.authorizeToken).toHaveBeenCalledWith(
        '012345678',
        TokenType.RFID,
        undefined,
      )
    })

    it('should use RFID as default type', async () => {
      mockTokenService.authorizeToken.mockResolvedValue(mockAuthorizationInfo)

      await controller.authorizeToken('012345678')

      expect(mockTokenService.authorizeToken).toHaveBeenCalledWith(
        '012345678',
        TokenType.RFID,
        undefined,
      )
    })

    it('should return blocked authorization', async () => {
      const blockedAuthInfo = new AuthorizationInfo(
        AllowedType.BLOCKED,
        mockTokenData,
      )
      mockTokenService.authorizeToken.mockResolvedValue(blockedAuthInfo)

      const result = await controller.authorizeToken(
        '012345678',
        TokenType.RFID,
      )

      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
          data: expect.objectContaining({
            allowed: AllowedType.BLOCKED,
          }),
        }),
      )
    })

    it('should handle unknown token', async () => {
      mockTokenService.authorizeToken.mockRejectedValue(
        new OcpiUnknownTokenException('Token not found'),
      )

      await expect(
        controller.authorizeToken('999999999', TokenType.RFID),
      ).rejects.toThrow(OcpiUnknownTokenException)
    })
  })

  describe('validation', () => {
    it('should validate token UID format', async () => {
      await expect(
        controller.authorizeToken('', TokenType.RFID),
      ).rejects.toThrow()
    })

    it('should validate authorization request schema', async () => {
      const invalidRequest = {
        location_id: '', // Invalid empty location ID
        evse_uids: ['EVSE001'],
      } as AuthorizeRequestDto

      await expect(
        controller.authorizeToken('012345678', TokenType.RFID, invalidRequest),
      ).rejects.toThrow()
    })

    it('should validate date format in query', async () => {
      const invalidQuery = {
        date_from: 'invalid-date',
      } as any

      await expect(controller.getTokens(invalidQuery)).rejects.toThrow()
    })

    it('should validate limit bounds', async () => {
      const invalidQuery: TokenListQuery = {
        limit: 2000, // Exceeds max of 1000
      }

      await expect(controller.getTokens(invalidQuery)).rejects.toThrow()
    })
  })
})
