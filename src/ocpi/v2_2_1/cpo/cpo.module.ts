import { Module } from '@nestjs/common'
import { CpoTokensModule } from './tokens/tokens.module'
import { CpoLocationsModule } from './locations/locations.module'

@Module({
  imports: [CpoTokensModule, CpoLocationsModule],
})
export class CpoModule {}
