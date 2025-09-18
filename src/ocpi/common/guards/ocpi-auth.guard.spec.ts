import { Test, TestingModule } from '@nestjs/testing'
import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { OcpiAuthGuard } from './ocpi-auth.guard'
import { OcpiTokenValidationService } from '../services/ocpi-token-validation.service'

describe('OcpiAuthGuard', () => {
  let guard: OcpiAuthGuard
  let reflector: Reflector
  let tokenValidationService: OcpiTokenValidationService

  const mockTokenValidationService = {
    validateCredentialsToken: vi.fn(),
  }

  const mockReflector = {
    getAllAndOverride: vi.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OcpiAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: OcpiTokenValidationService,
          useValue: mockTokenValidationService,
        },
      ],
    }).compile()

    guard = module.get<OcpiAuthGuard>(OcpiAuthGuard)
    reflector = module.get<Reflector>(Reflector)
    tokenValidationService = module.get<OcpiTokenValidationService>(
      OcpiTokenValidationService,
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const createMockExecutionContext = (authHeader?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization: authHeader,
          },
        }),
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    }) as any

  it('should be defined', () => {
    expect(guard).toBeDefined()
  })

  it('should skip authentication when @SkipOcpiAuth decorator is present', async () => {
    const mockGetAllAndOverride = vi.mocked(reflector.getAllAndOverride)
    mockGetAllAndOverride.mockReturnValue(true)

    const context = createMockExecutionContext()
    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(
      tokenValidationService.validateCredentialsToken,
    ).not.toHaveBeenCalled()
  })

  it('should throw UnauthorizedException when Authorization header is missing', async () => {
    const mockGetAllAndOverride = vi.mocked(reflector.getAllAndOverride)
    mockGetAllAndOverride.mockReturnValue(false)

    const context = createMockExecutionContext()

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    )
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Missing Authorization header',
    )
  })

  it('should throw UnauthorizedException when Authorization header format is invalid', async () => {
    const mockGetAllAndOverride = vi.fn().mockReturnValue(false)
    vi.mocked(reflector.getAllAndOverride).mockImplementation(
      mockGetAllAndOverride,
    )

    const context = createMockExecutionContext('Bearer some-token')

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    )
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid Authorization header format',
    )
  })

  it('should validate Base64 encoded token successfully', async () => {
    const mockGetAllAndOverride = vi.fn().mockReturnValue(false)
    const mockValidateToken = vi.fn()

    vi.mocked(reflector.getAllAndOverride).mockImplementation(
      mockGetAllAndOverride,
    )
    vi.mocked(
      tokenValidationService.validateCredentialsToken,
    ).mockImplementation(mockValidateToken)

    const mockParty = {
      countryCode: 'NL',
      partyId: 'TNM',
      role: 'EMSP',
      businessDetails: { name: 'Test EMSP' },
    }

    mockValidateToken.mockResolvedValue(mockParty)

    // Base64 encode 'test-token'
    const encodedToken = Buffer.from('test-token', 'utf-8').toString('base64')
    const context = createMockExecutionContext(`Token ${encodedToken}`)

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(mockValidateToken).toHaveBeenCalledWith('test-token')
  })

  it('should fallback to non-Base64 token for legacy implementations', async () => {
    const mockGetAllAndOverride = vi.fn().mockReturnValue(false)
    const mockValidateToken = vi.fn()

    vi.mocked(reflector.getAllAndOverride).mockImplementation(
      mockGetAllAndOverride,
    )
    vi.mocked(
      tokenValidationService.validateCredentialsToken,
    ).mockImplementation(mockValidateToken)

    const mockParty = {
      countryCode: 'NL',
      partyId: 'TNM',
      role: 'EMSP',
      businessDetails: { name: 'Test EMSP' },
    }

    mockValidateToken.mockResolvedValue(mockParty)

    const context = createMockExecutionContext('Token test-token')

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(mockValidateToken).toHaveBeenCalledWith('test-token')
  })

  it('should throw UnauthorizedException when token validation fails', async () => {
    const mockGetAllAndOverride = vi.fn().mockReturnValue(false)
    const mockValidateToken = vi.fn().mockResolvedValue(null)

    vi.mocked(reflector.getAllAndOverride).mockImplementation(
      mockGetAllAndOverride,
    )
    vi.mocked(
      tokenValidationService.validateCredentialsToken,
    ).mockImplementation(mockValidateToken)

    const context = createMockExecutionContext('Token test-token')

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    )
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Invalid or unknown credentials token',
    )
  })

  it('should add party information to request when validation succeeds', async () => {
    const mockGetAllAndOverride = vi.fn().mockReturnValue(false)
    const mockValidateToken = vi.fn()

    vi.mocked(reflector.getAllAndOverride).mockImplementation(
      mockGetAllAndOverride,
    )
    vi.mocked(
      tokenValidationService.validateCredentialsToken,
    ).mockImplementation(mockValidateToken)

    const mockParty = {
      countryCode: 'NL',
      partyId: 'TNM',
      role: 'EMSP',
      businessDetails: { name: 'Test EMSP' },
    }

    mockValidateToken.mockResolvedValue(mockParty)

    const mockRequest = { headers: { authorization: 'Token test-token' } }
    const context = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: vi.fn(),
      getClass: vi.fn(),
    } as any

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect((mockRequest as any).ocpiParty).toEqual(mockParty)
    expect((mockRequest as any).credentialsToken).toBe('test-token')
  })
})
