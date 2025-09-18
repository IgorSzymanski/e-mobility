// src/ocpi/versions/version-registry.ts
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

// Build dynamically from config at boot, or generate from actual controllers.
export const versionCatalog: VersionCatalog = Object.freeze({
  emsp: [
    {
      version: '2.3.0',
      endpoints: [
        {
          identifier: 'versions',
          url: 'https://you.example/ocpi/emsp/2.3.0/versions',
        },
        {
          identifier: 'credentials',
          url: 'https://you.example/ocpi/emsp/2.3.0/credentials',
        },
        {
          identifier: 'commands',
          url: 'https://you.example/ocpi/emsp/2.3.0/commands',
        },
        {
          identifier: 'sessions',
          url: 'https://you.example/ocpi/emsp/2.3.0/sessions',
        },
        // ...
      ],
    },
    {
      version: '2.2.1',
      endpoints: [
        {
          identifier: 'versions',
          url: 'https://you.example/ocpi/emsp/2.2.1/versions',
        },
        {
          identifier: 'credentials',
          url: 'https://you.example/ocpi/emsp/2.2.1/credentials',
        },
        {
          identifier: 'commands',
          url: 'https://you.example/ocpi/emsp/2.2.1/commands',
        },
        {
          identifier: 'sessions',
          url: 'https://you.example/ocpi/emsp/2.2.1/sessions',
        },
        // ...
      ],
    },
  ],
  cpo: [
    // same for CPO role...
  ],
})
