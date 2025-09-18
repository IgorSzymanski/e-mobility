import { Injectable, OnModuleInit } from '@nestjs/common'
import { DiscoveryService } from '@nestjs/core'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import type {
  OcpiVersion,
  OcpiRole,
  ModuleDescriptor,
} from './version-registry'
import {
  getOcpiEndpointMetadata,
  type OcpiEndpointMetadata,
} from '@/ocpi/common/decorators/ocpi-endpoint.decorator'

interface DiscoveredEndpoint {
  readonly metadata: OcpiEndpointMetadata
  readonly controllerName: string
}

@Injectable()
export class EndpointDiscoveryService implements OnModuleInit {
  private readonly discoveredEndpoints = new Map<string, ModuleDescriptor[]>()
  private readonly endpointRegistry = new Map<string, DiscoveredEndpoint[]>()

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly ocpiConfig: OcpiConfigService,
  ) {}

  onModuleInit() {
    this.discoverEndpoints()
    this.buildEndpointMaps()
  }

  private discoverEndpoints(): void {
    const controllers = this.discoveryService.getControllers()

    for (const controller of controllers) {
      if (!controller.metatype) continue

      const metadata = getOcpiEndpointMetadata(controller.metatype)

      if (metadata) {
        this.registerEndpoint(controller.metatype.name, metadata)
      }
    }
  }

  private registerEndpoint(
    controllerName: string,
    metadata: OcpiEndpointMetadata,
  ): void {
    const discovered: DiscoveredEndpoint = {
      metadata,
      controllerName,
    }

    for (const role of metadata.roles) {
      const key = this.getRegistryKey(role, metadata.version)
      const existing = this.endpointRegistry.get(key) || []
      this.endpointRegistry.set(key, [...existing, discovered])
    }
  }

  private buildEndpointMaps(): void {
    for (const [key, endpoints] of this.endpointRegistry.entries()) {
      const [role, version] = this.parseRegistryKey(key)

      const moduleDescriptors: ModuleDescriptor[] = endpoints.map(
        (endpoint) => ({
          identifier: endpoint.metadata.identifier,
          url: this.ocpiConfig.getEndpointUrl(
            role,
            version,
            endpoint.metadata.identifier,
          ),
        }),
      )

      this.discoveredEndpoints.set(key, moduleDescriptors)
    }
  }

  getAvailableEndpoints(
    role: OcpiRole,
    version: OcpiVersion,
  ): readonly ModuleDescriptor[] {
    const key = this.getRegistryKey(role, version)
    return Object.freeze(this.discoveredEndpoints.get(key) || [])
  }

  getSupportedVersions(role: OcpiRole): readonly OcpiVersion[] {
    const versions = new Set<OcpiVersion>()

    for (const key of this.endpointRegistry.keys()) {
      const [keyRole, version] = this.parseRegistryKey(key)
      if (keyRole === role) {
        versions.add(version)
      }
    }

    return Object.freeze(Array.from(versions))
  }

  getAllDiscoveredEndpoints(): ReadonlyMap<
    string,
    readonly DiscoveredEndpoint[]
  > {
    const result = new Map<string, readonly DiscoveredEndpoint[]>()
    for (const [key, endpoints] of this.endpointRegistry.entries()) {
      result.set(key, Object.freeze([...endpoints]))
    }
    return result
  }

  hasEndpoint(
    role: OcpiRole,
    version: OcpiVersion,
    identifier: ModuleDescriptor['identifier'],
  ): boolean {
    const endpoints = this.getAvailableEndpoints(role, version)
    return endpoints.some((endpoint) => endpoint.identifier === identifier)
  }

  private getRegistryKey(role: OcpiRole, version: OcpiVersion): string {
    return `${role}:${version}`
  }

  private parseRegistryKey(key: string): [OcpiRole, OcpiVersion] {
    const [role, version] = key.split(':') as [OcpiRole, OcpiVersion]
    return [role, version]
  }
}
