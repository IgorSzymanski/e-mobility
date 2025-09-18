// src/ocpi/versions/version-registry.ts
import { Injectable } from '@nestjs/common'
import { OcpiConfigService } from '@/shared/config/ocpi.config'

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
  readonly [role in OcpiRole]: ReadonlyArray<VersionDetails>
}

@Injectable()
export class VersionRegistryService {
  constructor(private readonly ocpiConfig: OcpiConfigService) {}

  getVersionCatalog(): VersionCatalog {
    return Object.freeze({
      emsp: [
        {
          version: '2.3.0',
          endpoints: [
            {
              identifier: 'versions',
              url: this.ocpiConfig.getEndpointUrl('emsp', '2.3.0', 'versions'),
            },
            {
              identifier: 'credentials',
              url: this.ocpiConfig.getEndpointUrl(
                'emsp',
                '2.3.0',
                'credentials',
              ),
            },
            {
              identifier: 'commands',
              url: this.ocpiConfig.getEndpointUrl('emsp', '2.3.0', 'commands'),
            },
            {
              identifier: 'sessions',
              url: this.ocpiConfig.getEndpointUrl('emsp', '2.3.0', 'sessions'),
            },
            // ...
          ],
        },
        {
          version: '2.2.1',
          endpoints: [
            {
              identifier: 'versions',
              url: this.ocpiConfig.getEndpointUrl('emsp', '2.2.1', 'versions'),
            },
            {
              identifier: 'credentials',
              url: this.ocpiConfig.getEndpointUrl(
                'emsp',
                '2.2.1',
                'credentials',
              ),
            },
            {
              identifier: 'commands',
              url: this.ocpiConfig.getEndpointUrl('emsp', '2.2.1', 'commands'),
            },
            {
              identifier: 'sessions',
              url: this.ocpiConfig.getEndpointUrl('emsp', '2.2.1', 'sessions'),
            },
            // ...
          ],
        },
      ],
      cpo: [
        // same for CPO role...
      ],
    })
  }
}
