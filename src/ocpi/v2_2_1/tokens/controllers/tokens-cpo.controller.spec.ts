import { Test, TestingModule } from '@nestjs/testing'
import { TokensCpoController } from './tokens-cpo.controller'
import { TokenService } from '../services/token.service'
import { Token } from '../../../../domain/tokens/token.aggregate'
import { TokenId } from '../../../../domain/tokens/value-objects/token-id'
import {
  TokenType,
  WhitelistType,
} from '../../../../domain/tokens/enums/token-enums'
import { TokenDto } from '../dto/token.dto'
import { OcpiUnknownTokenException } from '../../../../shared/exceptions/ocpi.exceptions'
import { OcpiAuthGuard } from '@/ocpi/common/guards/ocpi-auth.guard'

describe('TokensCpoController', () => {
  let controller: TokensCpoController
  let mockTokenService: any

  const validToken = new Token(
    new TokenId('NL', 'TNM', '012345678'),
    TokenType.RFID,
    'NL8ACC12E46L89',
    'TheNewMotion',
    true,
    WhitelistType.ALLOWED,
    new Date('2023-01-15T10:30:00.000Z'),
    'DF000-2001-8999-1',
    'DF000-2001-8999',
  )

  const validTokenDto: TokenDto = {
    country_code: 'NL',
    party_id: 'TNM',
    uid: '012345678',
    type: TokenType.RFID,
    contract_id: 'NL8ACC12E46L89',
    visual_number: 'DF000-2001-8999-1',
    issuer: 'TheNewMotion',
    group_id: 'DF000-2001-8999',
    valid: true,
    whitelist: WhitelistType.ALLOWED,
    last_updated: '2023-01-15T10:30:00.000Z',
  }

  beforeEach(async () => {
    const mockService = {
      getToken: vi.fn(),
      createOrUpdateToken: vi.fn(),
      updateToken: vi.fn(),
    } as any

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokensCpoController],
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

    controller = module.get<TokensCpoController>(TokensCpoController)
    mockTokenService = module.get(TokenService)
  })

  describe('getToken', () => {
    it('should return token successfully', async () => {
      mockTokenService.getToken.mockResolvedValue(validToken)

      const result = await controller.getToken(
        'NL',
        'TNM',
        '012345678',
        TokenType.RFID,
      )

      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
          data: expect.objectContaining({
            country_code: 'NL',
            party_id: 'TNM',
            uid: '012345678',
            type: TokenType.RFID,
          }),
        }),
      )
      expect(mockTokenService.getToken).toHaveBeenCalledWith(
        'NL',
        'TNM',
        '012345678',
        TokenType.RFID,
      )
    })

    it('should use RFID as default type', async () => {
      mockTokenService.getToken.mockResolvedValue(validToken)

      await controller.getToken('NL', 'TNM', '012345678')

      expect(mockTokenService.getToken).toHaveBeenCalledWith(
        'NL',
        'TNM',
        '012345678',
        TokenType.RFID,
      )
    })

    it('should handle token not found', async () => {
      mockTokenService.getToken.mockRejectedValue(
        new OcpiUnknownTokenException('Token not found'),
      )

      await expect(
        controller.getToken('NL', 'TNM', '999999999', TokenType.RFID),
      ).rejects.toThrow(OcpiUnknownTokenException)
    })
  })

  describe('putToken', () => {
    it('should create new token successfully', async () => {
      mockTokenService.createOrUpdateToken.mockResolvedValue(validToken)

      const result = await controller.putToken(
        'NL',
        'TNM',
        '012345678',
        validTokenDto,
      )

      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
        }),
      )
      expect(mockTokenService.createOrUpdateToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.objectContaining({
            countryCode: 'NL',
            partyId: 'TNM',
            uid: '012345678',
          }),
          type: TokenType.RFID,
        }),
      )
    })

    it('should validate URL parameters match body', async () => {
      const mismatchedDto = { ...validTokenDto, country_code: 'DE' }

      await expect(
        controller.putToken('NL', 'TNM', '012345678', mismatchedDto),
      ).rejects.toThrow()
    })

    it('should validate token DTO schema', async () => {
      const invalidDto = { ...validTokenDto, country_code: 'INVALID' } as any

      await expect(
        controller.putToken('NL', 'TNM', '012345678', invalidDto),
      ).rejects.toThrow()
    })
  })

  describe('patchToken', () => {
    it('should update token partially', async () => {
      const invalidatedToken = validToken.invalidate()
      mockTokenService.updateToken.mockResolvedValue(invalidatedToken)

      const patchData = {
        valid: false,
        last_updated: '2023-01-15T11:00:00.000Z',
      }

      const result = await controller.patchToken(
        'NL',
        'TNM',
        '012345678',
        patchData,
        TokenType.RFID,
      )

      expect(result).toEqual(
        expect.objectContaining({
          status_code: 1000,
        }),
      )
      expect(mockTokenService.updateToken).toHaveBeenCalledWith(
        'NL',
        'TNM',
        '012345678',
        TokenType.RFID,
        expect.objectContaining({ valid: false }),
      )
    })

    it('should require last_updated field for PATCH', async () => {
      const patchDataWithoutTimestamp = { valid: false } as any

      await expect(
        controller.patchToken(
          'NL',
          'TNM',
          '012345678',
          patchDataWithoutTimestamp,
          TokenType.RFID,
        ),
      ).rejects.toThrow()
    })

    it('should use RFID as default type for PATCH', async () => {
      const invalidatedToken = validToken.invalidate()
      mockTokenService.updateToken.mockResolvedValue(invalidatedToken)

      const patchData = {
        valid: false,
        last_updated: '2023-01-15T11:00:00.000Z',
      }

      await controller.patchToken('NL', 'TNM', '012345678', patchData)

      expect(mockTokenService.updateToken).toHaveBeenCalledWith(
        'NL',
        'TNM',
        '012345678',
        TokenType.RFID,
        expect.anything(),
      )
    })
  })

  describe('validation', () => {
    it('should validate country code format', async () => {
      await expect(
        controller.getToken('INVALID', 'TNM', '012345678'),
      ).rejects.toThrow()
    })

    it('should validate party ID format', async () => {
      await expect(
        controller.getToken('NL', 'INVALID', '012345678'),
      ).rejects.toThrow()
    })

    it('should validate token UID format', async () => {
      await expect(controller.getToken('NL', 'TNM', '')).rejects.toThrow()
    })
  })
})
