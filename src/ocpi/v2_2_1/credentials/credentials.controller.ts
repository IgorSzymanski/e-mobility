// ocpi/v2_2_1/credentials/credentials.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import type { CredentialsDto } from './dto/credentials.dto'
import { CredentialsService221 } from './credentials.service'
import {
  OcpiResponse,
  createOcpiSuccessResponse,
} from '@/ocpi/v2_2_1/common/ocpi-envelope'
import { OcpiEndpoint } from '@/ocpi/common/decorators/ocpi-endpoint.decorator'
import { SkipOcpiAuth } from '@/ocpi/common/decorators/skip-ocpi-auth.decorator'

@OcpiEndpoint({
  identifier: 'credentials',
  version: '2.2.1',
  roles: ['cpo', 'emsp'],
})
@Controller('/ocpi/:role/2.2.1/credentials')
export class CredentialsController221 {
  readonly #svc: CredentialsService221
  constructor(svc: CredentialsService221) {
    this.#svc = svc
  }

  @Get()
  async get(): Promise<OcpiResponse<CredentialsDto>> {
    const data = await this.#svc.getOurCredentials()
    return createOcpiSuccessResponse(data)
  }

  // Registration start (client sent us its credentials: includes their B + versions URL)
  @SkipOcpiAuth() // Uses CREDENTIALS_TOKEN_A during initial registration
  @Post()
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() clientCreds: CredentialsDto,
  ): Promise<OcpiResponse<CredentialsDto>> {
    const result = await this.#svc.handlePost(clientCreds)
    return createOcpiSuccessResponse(result)
  }

  // Rotate token and/or switch version
  @Put()
  @HttpCode(HttpStatus.OK)
  async update(
    @Body() clientCreds: CredentialsDto,
  ): Promise<OcpiResponse<CredentialsDto>> {
    const result = await this.#svc.handlePut(clientCreds)
    return createOcpiSuccessResponse(result)
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async unregister(
    @Req() req: Request & { credentialsToken?: string },
  ): Promise<OcpiResponse<undefined>> {
    if (!req.credentialsToken) {
      throw new Error('Missing credentials token in request context')
    }
    await this.#svc.handleDelete(req.credentialsToken)
    return createOcpiSuccessResponse(undefined)
  }
}
