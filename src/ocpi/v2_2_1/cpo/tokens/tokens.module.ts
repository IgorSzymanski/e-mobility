import { Module } from '@nestjs/common'
import { TokensCpoController } from './tokens.controller'
import { CommonTokensModule } from '../../common/tokens/tokens.module'
import { CommonCredentialsModule } from '../../common/credentials/credentials.module'

@Module({
  imports: [CommonTokensModule, CommonCredentialsModule],
  controllers: [TokensCpoController],
})
export class CpoTokensModule {}
