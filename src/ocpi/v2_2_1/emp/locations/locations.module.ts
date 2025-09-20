import { Module } from '@nestjs/common'
import { LocationsController } from './locations.controller'
import { CommonLocationsModule } from '../../common/locations/locations.module'
import { EmpLocationService } from '@/domain/locations/services/emp-location.service'
import type { LocationRepository } from '../../common/locations/repositories/location.repository'

@Module({
  imports: [CommonLocationsModule],
  controllers: [LocationsController],
  providers: [
    {
      provide: EmpLocationService,
      useFactory: (locationRepository: LocationRepository) =>
        new EmpLocationService(locationRepository),
      inject: ['LocationRepository'],
    },
  ],
})
export class EmpLocationsModule {}
