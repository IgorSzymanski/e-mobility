import { Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { VersionsController } from './versions/versions.controller'
import { VersionRegistryService } from './versions/version-registry'
import { EndpointDiscoveryService } from './versions/endpoint-discovery.service'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import { CredentialsController221 } from './v2_2_1/credentials/credentials.controller'
import { CredentialsService221 } from './v2_2_1/credentials/credentials.service'

@Module({
  imports: [DiscoveryModule],
  controllers: [VersionsController, CredentialsController221],
  providers: [
    VersionRegistryService,
    EndpointDiscoveryService,
    OcpiConfigService,
    CredentialsService221,
  ],
  exports: [VersionRegistryService, EndpointDiscoveryService],
})
export class OcpiModule {}
