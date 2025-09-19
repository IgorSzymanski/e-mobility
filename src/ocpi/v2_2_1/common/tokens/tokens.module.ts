import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { TokenService } from './services/token.service'
import { TokenPrismaRepository } from './repositories/token-prisma.repository'

@Module({
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
export class CommonTokensModule {}
