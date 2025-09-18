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
} from '@nestjs/common'
import type { CredentialsDto } from './dto/credentials.dto'
import { CredentialsService221 } from './credentials.service'
import {
  OcpiResponse,
  createOcpiSuccessResponse,
} from '@/ocpi/v2_2_1/common/ocpi-envelope'
import { OcpiEndpoint } from '@/ocpi/common/decorators/ocpi-endpoint.decorator'

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
  async unregister(): Promise<OcpiResponse<undefined>> {
    await this.#svc.handleDelete()
    return createOcpiSuccessResponse(undefined)
  }
}
