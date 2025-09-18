// src/ocpi/versions/version-registry.ts
import { Injectable } from '@nestjs/common'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import { EndpointDiscoveryService } from './endpoint-discovery.service'

export type OcpiVersion = '2.2.1' | '2.3.0'
export type OcpiRole = 'cpo' | 'emsp'

export interface ModuleDescriptor {
  readonly identifier:
    | 'sessions'
    | 'cdrs'
    | 'locations'
    | 'tokens'
    | 'commands'
    | 'tariffs'
    | 'credentials'
    | 'versions'
  readonly url: string // absolute URL of this module root
}

export interface VersionDetails {
  readonly version: OcpiVersion
  readonly endpoints: ReadonlyArray<ModuleDescriptor>
}

export type VersionCatalog = {
  readonly [role in OcpiRole]: readonly VersionDetails[]
}

@Injectable()
export class VersionRegistryService {
  constructor(
    private readonly ocpiConfig: OcpiConfigService,
    private readonly endpointDiscovery: EndpointDiscoveryService,
  ) {}

  getVersionCatalog(): VersionCatalog {
    const catalog: Record<OcpiRole, readonly VersionDetails[]> = {
      cpo: [],
      emsp: [],
    }

    // Dynamically build catalog from discovered endpoints
    for (const role of ['cpo', 'emsp'] as const) {
      const roleVersions: VersionDetails[] = []

      for (const version of ['2.2.1', '2.3.0'] as const) {
        const discoveredEndpoints =
          this.endpointDiscovery.getAvailableEndpoints(role, version)

        if (discoveredEndpoints.length > 0) {
          // Always include the versions endpoint for each supported version
          const endpoints: ModuleDescriptor[] = [
            {
              identifier: 'versions',
              url: this.ocpiConfig.getEndpointUrl(role, version, 'versions'),
            },
            ...discoveredEndpoints,
          ]

          roleVersions.push({
            version,
            endpoints: Object.freeze(endpoints),
          })
        }
      }

      if (roleVersions.length > 0) {
        catalog[role] = Object.freeze(roleVersions)
      }
    }

    return Object.freeze(catalog)
  }

  getSupportedVersions(role: OcpiRole): readonly OcpiVersion[] {
    return this.endpointDiscovery.getSupportedVersions(role)
  }

  hasEndpoint(
    role: OcpiRole,
    version: OcpiVersion,
    identifier: ModuleDescriptor['identifier'],
  ): boolean {
    return this.endpointDiscovery.hasEndpoint(role, version, identifier)
  }

  getEndpointUrl(
    role: OcpiRole,
    version: OcpiVersion,
    identifier: ModuleDescriptor['identifier'],
  ): string | null {
    const endpoints = this.endpointDiscovery.getAvailableEndpoints(
      role,
      version,
    )
    const endpoint = endpoints.find((ep) => ep.identifier === identifier)
    return endpoint?.url || null
  }
}
