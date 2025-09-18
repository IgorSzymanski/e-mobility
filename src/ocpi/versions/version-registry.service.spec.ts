import { Test, TestingModule } from '@nestjs/testing'
import { VersionRegistryService } from './version-registry'
import { EndpointDiscoveryService } from './endpoint-discovery.service'
import { OcpiConfigService } from '@/shared/config/ocpi.config'

describe('VersionRegistryService', () => {
  let service: VersionRegistryService
  let endpointDiscovery: EndpointDiscoveryService

  beforeEach(async () => {
    const mockEndpointDiscovery = {
      getAvailableEndpoints: vi.fn().mockImplementation((role, version) => {
        if (role === 'cpo' && version === '2.2.1') {
          return [
            {
              identifier: 'credentials',
              url: `http://localhost:3000/ocpi/${role}/${version}/credentials`,
            },
          ]
        }
        return []
      }),
      getSupportedVersions: vi.fn().mockReturnValue(['2.2.1']),
      hasEndpoint: vi.fn().mockReturnValue(true),
    }

    const mockOcpiConfig = {
      getEndpointUrl: vi.fn().mockImplementation((role, version, identifier) =>
        `http://localhost:3000/ocpi/${role}/${version}/${identifier}`
      ),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VersionRegistryService,
        {
          provide: EndpointDiscoveryService,
          useValue: mockEndpointDiscovery,
        },
        {
          provide: OcpiConfigService,
          useValue: mockOcpiConfig,
        },
      ],
    }).compile()

    service = module.get<VersionRegistryService>(VersionRegistryService)
    endpointDiscovery = module.get<EndpointDiscoveryService>(EndpointDiscoveryService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should generate version catalog dynamically', () => {
    const catalog = service.getVersionCatalog()

    expect(catalog.cpo).toHaveLength(1)
    expect(catalog.cpo[0].version).toBe('2.2.1')
    expect(catalog.cpo[0].endpoints).toHaveLength(2) // versions + credentials

    // Check versions endpoint is always included
    expect(catalog.cpo[0].endpoints[0]).toEqual({
      identifier: 'versions',
      url: 'http://localhost:3000/ocpi/cpo/2.2.1/versions',
    })

    // Check discovered endpoint is included
    expect(catalog.cpo[0].endpoints[1]).toEqual({
      identifier: 'credentials',
      url: 'http://localhost:3000/ocpi/cpo/2.2.1/credentials',
    })
  })

  it('should return empty catalog when no endpoints are discovered', () => {
    vi.mocked(endpointDiscovery.getAvailableEndpoints).mockReturnValue([])

    const catalog = service.getVersionCatalog()

    expect(catalog.cpo).toHaveLength(0)
    expect(catalog.emsp).toHaveLength(0)
  })

  it('should delegate to endpoint discovery service', () => {
    service.getSupportedVersions('cpo')
    expect(endpointDiscovery.getSupportedVersions).toHaveBeenCalledWith('cpo')

    service.hasEndpoint('cpo', '2.2.1', 'credentials')
    expect(endpointDiscovery.hasEndpoint).toHaveBeenCalledWith('cpo', '2.2.1', 'credentials')
  })

  it('should return endpoint URL or null', () => {
    const url = service.getEndpointUrl('cpo', '2.2.1', 'credentials')
    expect(url).toBe('http://localhost:3000/ocpi/cpo/2.2.1/credentials')

    vi.mocked(endpointDiscovery.getAvailableEndpoints).mockReturnValue([])
    const nullUrl = service.getEndpointUrl('cpo', '2.2.1', 'non-existent')
    expect(nullUrl).toBeNull()
  })
})