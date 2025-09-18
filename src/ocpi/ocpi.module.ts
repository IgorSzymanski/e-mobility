import { Module } from '@nestjs/common'
import { VersionsController } from './versions/versions.controller'
import { VersionRegistryService } from './versions/version-registry'
import { OcpiConfigService } from '@/shared/config/ocpi.config'

@Module({
  controllers: [VersionsController],
  providers: [VersionRegistryService, OcpiConfigService],
})
export class OcpiModule {}
