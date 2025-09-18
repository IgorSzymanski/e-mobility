import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { TokenGenerator } from '@/infrastructure/security/token-generator'
import { BootstrapTokensRepository } from '@/infrastructure/persistence/bootstrap-tokens.repository'
import { BootstrapTokensService } from '@/admin/bootstrap-tokens/bootstrap-tokens.service'

@Module({
  providers: [
    PrismaClient,
    TokenGenerator,
    BootstrapTokensRepository,
    BootstrapTokensService,
  ],
  exports: [PrismaClient, TokenGenerator, BootstrapTokensService],
})
export class SharedModule {}
