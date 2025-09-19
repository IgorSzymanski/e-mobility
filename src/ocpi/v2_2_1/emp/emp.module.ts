import { Module } from '@nestjs/common'
import { EmpTokensModule } from './tokens/tokens.module'

@Module({
  imports: [EmpTokensModule],
})
export class EmpModule {}
