import { Module } from '@nestjs/common'
import { EmpTokensModule } from './tokens/tokens.module'
import { EmpLocationsModule } from './locations/locations.module'

@Module({
  imports: [EmpTokensModule, EmpLocationsModule],
})
export class EmpModule {}
