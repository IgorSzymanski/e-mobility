import { Module } from '@nestjs/common'
import { OcpiTokenValidationService } from '@/ocpi/common/services/ocpi-token-validation.service'
import { BootstrapTokensService } from '@/admin/bootstrap-tokens/bootstrap-tokens.service'
import { PeersRepository } from '@/infrastructure/persistence/peers.repository'
import { BootstrapTokensRepository } from '@/infrastructure/persistence/bootstrap-tokens.repository'
import { TokenGenerator } from '@/infrastructure/security/token-generator'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import { PrismaClient } from '@prisma/client'

@Module({
  providers: [
    OcpiTokenValidationService,
    BootstrapTokensService,
    PeersRepository,
    BootstrapTokensRepository,
    TokenGenerator,
    OcpiConfigService,
    PrismaClient,
  ],
  exports: [
    OcpiTokenValidationService,
    BootstrapTokensService,
    PeersRepository,
    BootstrapTokensRepository,
    TokenGenerator,
    OcpiConfigService,
  ],
})
export class CommonCredentialsModule {}
