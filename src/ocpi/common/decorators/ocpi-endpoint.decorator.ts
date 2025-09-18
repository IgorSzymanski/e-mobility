import 'reflect-metadata'
import type { OcpiVersion, OcpiRole } from '@/ocpi/versions/version-registry'
import type { ModuleDescriptor } from '@/ocpi/versions/version-registry'

export interface OcpiEndpointMetadata {
  readonly identifier: ModuleDescriptor['identifier']
  readonly version: OcpiVersion
  readonly roles: readonly OcpiRole[]
}

export const OCPI_ENDPOINT_METADATA = Symbol('ocpi:endpoint')

export function OcpiEndpoint(metadata: OcpiEndpointMetadata) {
  return function <T extends new (...args: any[]) => any>(target: T): T {
    Reflect.defineMetadata(OCPI_ENDPOINT_METADATA, metadata, target)
    return target
  }
}

export function getOcpiEndpointMetadata(
  target: any,
): OcpiEndpointMetadata | undefined {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return
  return Reflect.getMetadata(OCPI_ENDPOINT_METADATA, target)
}
