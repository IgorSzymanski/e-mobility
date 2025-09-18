import { Module } from '@nestjs/common'
import { VersionsController } from './versions/versions.controller'

@Module({
  controllers: [VersionsController],
})
export class OcpiModule {}
