import { Module } from '@nestjs/common'
import { TokensEmspController } from './tokens.controller'
import { CommonTokensModule } from '../../common/tokens/tokens.module'
import { CommonCredentialsModule } from '../../common/credentials/credentials.module'

@Module({
  imports: [CommonTokensModule, CommonCredentialsModule],
  controllers: [TokensEmspController],
})
export class EmpTokensModule {}
