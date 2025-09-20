import { Module } from '@nestjs/common'
import { LocationsController } from './locations.controller'
import { CommonLocationsModule } from '../../common/locations/locations.module'

@Module({
  imports: [CommonLocationsModule],
  controllers: [LocationsController],
})
export class CpoLocationsModule {}
