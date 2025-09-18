// admin/admin.module.ts
import { Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { BootstrapTokensRepository } from '@/infrastructure/persistence/bootstrap-tokens.repository'
import { BootstrapTokensService } from './bootstrap-tokens/bootstrap-tokens.service'
import { BootstrapTokensController } from './bootstrap-tokens/bootstrap-tokens.controller'
import { TokenGenerator } from '@/infrastructure/security/token-generator'

@Module({
  providers: [
    PrismaClient,
    TokenGenerator,
    BootstrapTokensRepository,
    BootstrapTokensService,
  ],
  controllers: [BootstrapTokensController],
  exports: [BootstrapTokensService],
})
export class AdminModule {}
