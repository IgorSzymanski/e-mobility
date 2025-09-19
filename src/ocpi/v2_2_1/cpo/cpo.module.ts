import { Module } from '@nestjs/common'
import { CpoTokensModule } from './tokens/tokens.module'

@Module({
  imports: [CpoTokensModule],
})
export class CpoModule {}
