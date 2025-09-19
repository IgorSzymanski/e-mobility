import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { TokenService } from './services/token.service'
import { TokensCpoController } from './controllers/tokens-cpo.controller'
import { TokensEmspController } from './controllers/tokens-emsp.controller'
import { TokenPrismaRepository } from './repositories/token-prisma.repository'

@Module({
  controllers: [TokensCpoController, TokensEmspController],
  providers: [
    TokenService,
    {
      provide: 'TokenRepository',
      useFactory: (prisma: PrismaClient) => new TokenPrismaRepository(prisma),
      inject: [PrismaClient],
    },
    PrismaClient,
  ],
  exports: [TokenService],
})
export class TokensModule {}
