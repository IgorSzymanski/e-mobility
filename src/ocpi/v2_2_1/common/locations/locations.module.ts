import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { LocationService } from './services/location.service'
import { LocationPrismaRepository } from './repositories/location-prisma.repository'
import { OcpiContextService } from '@/ocpi/common/services/ocpi-context.service'

@Module({
  providers: [
    LocationService,
    OcpiContextService,
    {
      provide: 'LocationRepository',
      useFactory: (prisma: PrismaClient, contextService: OcpiContextService) =>
        new LocationPrismaRepository(prisma, contextService),
      inject: [PrismaClient, OcpiContextService],
    },
    PrismaClient,
  ],
  exports: [LocationService, OcpiContextService],
})
export class CommonLocationsModule {}
