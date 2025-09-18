// admin/bootstrap-tokens/bootstrap-tokens.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common'
import { ZodValidationPipe } from 'nestjs-zod'
import { BootstrapTokensService } from './bootstrap-tokens.service'
import {
  type CreateBootstrapTokenDto,
  CreateBootstrapTokenSchema,
} from './dto/bootstrap-token.dto'
import { SkipOcpiAuth } from '@/ocpi/common/decorators/skip-ocpi-auth.decorator'

export interface AdminResponse<T = any> {
  success: boolean
  data?: T
  message?: string
}

function createAdminResponse<T>(data?: T, message?: string): AdminResponse<T> {
  return {
    success: true,
    data,
    message,
  }
}

@SkipOcpiAuth()
@Controller('/admin/ocpi/bootstrap-tokens')
export class BootstrapTokensController {
  readonly #service: BootstrapTokensService

  constructor(service: BootstrapTokensService) {
    this.#service = service
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateBootstrapTokenSchema))
  async createToken(
    @Body() dto: CreateBootstrapTokenDto,
  ): Promise<AdminResponse> {
    const token = await this.#service.createToken(dto)
    return createAdminResponse(token, 'Bootstrap token created successfully')
  }

  @Get()
  async listTokens(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<AdminResponse> {
    const includeInactiveFlag = includeInactive === 'true'
    const tokens = await this.#service.listTokens(includeInactiveFlag)
    return createAdminResponse(tokens)
  }

  @Get(':id')
  async getToken(@Param('id') id: string): Promise<AdminResponse> {
    const token = await this.#service.getTokenById(id)
    if (!token) {
      return createAdminResponse(null, 'Bootstrap token not found')
    }
    return createAdminResponse(token)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deactivateToken(@Param('id') id: string): Promise<AdminResponse> {
    await this.#service.deactivateToken(id)
    return createAdminResponse(null, 'Bootstrap token deactivated successfully')
  }

  @Post('/cleanup-expired')
  @HttpCode(HttpStatus.OK)
  async cleanupExpiredTokens(): Promise<AdminResponse> {
    const deletedCount = await this.#service.cleanupExpiredTokens()
    return createAdminResponse(
      { deletedCount },
      `Cleaned up ${deletedCount} expired tokens`,
    )
  }
}
