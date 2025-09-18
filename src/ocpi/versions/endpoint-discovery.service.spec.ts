import { Test, TestingModule } from '@nestjs/testing'
import { DiscoveryService } from '@nestjs/core'
import { EndpointDiscoveryService } from './endpoint-discovery.service'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import { OcpiEndpoint } from '@/ocpi/common/decorators/ocpi-endpoint.decorator'
import { Controller } from '@nestjs/common'

@OcpiEndpoint({
  identifier: 'sessions',
  version: '2.2.1',
  roles: ['cpo', 'emsp'],
})
@Controller('/ocpi/:role/2.2.1/test')
class TestController {}

describe('EndpointDiscoveryService', () => {
  let service: EndpointDiscoveryService
  let discoveryService: DiscoveryService
  let ocpiConfig: OcpiConfigService

  beforeEach(async () => {
    const mockDiscoveryService = {
      getControllers: vi.fn().mockReturnValue([
        {
          metatype: TestController,
        },
      ]),
    }

    const mockOcpiConfig = {
      getEndpointUrl: vi
        .fn()
        .mockImplementation(
          (role, version, identifier) =>
            `http://localhost:3000/ocpi/${role}/${version}/${identifier}`,
        ),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndpointDiscoveryService,
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: OcpiConfigService,
          useValue: mockOcpiConfig,
        },
      ],
    }).compile()

    service = module.get<EndpointDiscoveryService>(EndpointDiscoveryService)
    discoveryService = module.get<DiscoveryService>(DiscoveryService)
    ocpiConfig = module.get<OcpiConfigService>(OcpiConfigService)

    // Manually trigger initialization
    await service.onModuleInit()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should discover endpoints from decorated controllers', () => {
    const endpoints = service.getAvailableEndpoints('cpo', '2.2.1')

    expect(endpoints).toHaveLength(1)
    expect(endpoints[0]).toEqual({
      identifier: 'sessions',
      url: 'http://localhost:3000/ocpi/cpo/2.2.1/sessions',
    })
  })

  it('should return supported versions for a role', () => {
    const versions = service.getSupportedVersions('cpo')

    expect(versions).toContain('2.2.1')
  })

  it('should check if endpoint exists', () => {
    expect(service.hasEndpoint('cpo', '2.2.1', 'sessions')).toBe(true)
    expect(service.hasEndpoint('cpo', '2.2.1', 'non-existent' as any)).toBe(
      false,
    )
  })

  it('should return empty array for unsupported role/version', () => {
    const endpoints = service.getAvailableEndpoints('cpo', '2.3.0')

    expect(endpoints).toHaveLength(0)
  })
})
