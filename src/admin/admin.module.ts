// admin/admin.module.ts
import { Module } from '@nestjs/common'
import { BootstrapTokensController } from './bootstrap-tokens/bootstrap-tokens.controller'
import { SharedModule } from '@/shared/shared.module'

@Module({
  imports: [SharedModule],
  controllers: [BootstrapTokensController],
})
export class AdminModule {}
