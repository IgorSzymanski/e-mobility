import { Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { HttpModule } from '@nestjs/axios'
import { VersionsController } from './versions/versions.controller'
import { VersionRegistryService } from './versions/version-registry'
import { EndpointDiscoveryService } from './versions/endpoint-discovery.service'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import { CredentialsController221 } from './v2_2_1/credentials/credentials.controller'
import { CredentialsService221 } from './v2_2_1/credentials/credentials.service'
import { VersionsClient221 } from './v2_2_1/versions/versions.client'
import { OcpiAuthGuard } from './common/guards/ocpi-auth.guard'
import { OcpiTokenValidationService } from './common/services/ocpi-token-validation.service'
import { PeersRepository } from '@/infrastructure/persistence/peers.repository'
import { SharedModule } from '@/shared/shared.module'

@Module({
  imports: [DiscoveryModule, HttpModule, SharedModule],
  controllers: [VersionsController, CredentialsController221],
  providers: [
    VersionRegistryService,
    EndpointDiscoveryService,
    OcpiConfigService,
    CredentialsService221,
    VersionsClient221,
    OcpiTokenValidationService,
    PeersRepository,
    OcpiAuthGuard,
  ],
  exports: [VersionRegistryService, EndpointDiscoveryService],
})
export class OcpiModule {}
