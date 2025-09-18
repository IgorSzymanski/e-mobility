import { Test, TestingModule } from '@nestjs/testing'
import { OcpiTokenValidationService } from './ocpi-token-validation.service'
import { PeersRepository } from '@/infrastructure/persistence/peers.repository'

describe('OcpiTokenValidationService', () => {
  let service: OcpiTokenValidationService
  let peersRepository: PeersRepository

  const mockPeersRepository = {
    findByCredentialsToken: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcpiTokenValidationService,
        {
          provide: PeersRepository,
          useValue: mockPeersRepository,
        },
      ],
    }).compile()

    service = module.get<OcpiTokenValidationService>(OcpiTokenValidationService)
    peersRepository = module.get<PeersRepository>(PeersRepository)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('validateCredentialsToken', () => {
    it('should return party information for valid token', async () => {
      const mockPeer = {
        countryCode: 'NL',
        partyId: 'TNM',
        role: 'EMSP',
        businessDetailsName: 'Test EMSP',
        businessDetailsWebsite: 'https://test-emsp.com',
      }

      const mockFindByToken = vi.mocked(peersRepository.findByCredentialsToken)
      mockFindByToken.mockResolvedValue(mockPeer)

      const result = await service.validateCredentialsToken('test-token')

      expect(result).toEqual({
        countryCode: 'NL',
        partyId: 'TNM',
        role: 'EMSP',
        businessDetails: {
          name: 'Test EMSP',
          website: 'https://test-emsp.com',
        },
      })
      expect(mockFindByToken).toHaveBeenCalledWith('test-token')
    })

    it('should return party information without website if not provided', async () => {
      const mockPeer = {
        countryCode: 'DE',
        partyId: 'ABC',
        role: 'CPO',
        businessDetailsName: 'Test CPO',
        businessDetailsWebsite: null,
      }

      const mockFindByToken = vi.mocked(peersRepository.findByCredentialsToken)
      mockFindByToken.mockResolvedValue(mockPeer)

      const result = await service.validateCredentialsToken('test-token')

      expect(result).toEqual({
        countryCode: 'DE',
        partyId: 'ABC',
        role: 'CPO',
        businessDetails: {
          name: 'Test CPO',
          website: undefined,
        },
      })
    })

    it('should return null for unknown token', async () => {
      const mockFindByToken = vi.mocked(peersRepository.findByCredentialsToken)
      mockFindByToken.mockResolvedValue(null)

      const result = await service.validateCredentialsToken('unknown-token')

      expect(result).toBeNull()
      expect(mockFindByToken).toHaveBeenCalledWith('unknown-token')
    })

    it('should return null and log error when repository throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockFindByToken = vi.mocked(peersRepository.findByCredentialsToken)
      mockFindByToken.mockRejectedValue(new Error('Database error'))

      const result = await service.validateCredentialsToken('test-token')

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error validating credentials token:',
        expect.any(Error),
      )

      consoleSpy.mockRestore()
    })
  })

  describe('hasEndpointAccess', () => {
    const mockParty = {
      countryCode: 'NL',
      partyId: 'TNM',
      role: 'EMSP',
      businessDetails: { name: 'Test EMSP' },
    }

    it('should allow access to configuration endpoints', () => {
      expect(service.hasEndpointAccess(mockParty, 'versions')).toBe(true)
      expect(service.hasEndpointAccess(mockParty, 'credentials')).toBe(true)
    })

    it('should allow access to functional endpoints for authenticated parties', () => {
      expect(service.hasEndpointAccess(mockParty, 'locations')).toBe(true)
      expect(service.hasEndpointAccess(mockParty, 'tokens')).toBe(true)
      expect(service.hasEndpointAccess(mockParty, 'sessions')).toBe(true)
    })
  })
})
