import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger'
import { z } from 'zod'
import { TokenService } from '../../common/tokens/services/token.service'
import { Token } from '@/domain/tokens/token.aggregate'
import { TokenType, WhitelistType } from '@/domain/tokens/enums/token-enums'
import type { TokenDto } from '../../common/tokens/dto/token.dto'
import { TokenDtoSchema } from '../../common/tokens/dto/token.dto'
import type { OcpiResponse } from '@/ocpi/v2_2_1/common/ocpi-envelope'
import { createOcpiSuccessResponse } from '@/ocpi/v2_2_1/common/ocpi-envelope'
import { OcpiEndpoint } from '@/ocpi/common/decorators/ocpi-endpoint.decorator'
import { OcpiAuthGuard } from '@/ocpi/common/guards/ocpi-auth.guard'
import { OcpiInvalidParametersException } from '@/shared/exceptions/ocpi.exceptions'
import { ZodValidationPipe } from 'nestjs-zod'

// URL parameters validation schemas
const CountryCodeSchema = z
  .string()
  .length(2, 'Country code must be exactly 2 characters')
const PartyIdSchema = z
  .string()
  .length(3, 'Party ID must be exactly 3 characters')
const TokenUidSchema = z
  .string()
  .min(1, 'Token UID cannot be empty')
  .max(36, 'Token UID must be max 36 characters')

// PATCH request schema
const TokenPatchSchema = z.object({
  valid: z.boolean().optional(),
  whitelist: z
    .enum(['ALWAYS', 'ALLOWED', 'ALLOWED_OFFLINE', 'NEVER'])
    .optional(),
  visual_number: z.string().max(64).optional(),
  group_id: z.string().max(36).optional(),
  language: z.string().length(2).optional(),
  last_updated: z.string().datetime(), // Required for PATCH operations
})

type TokenPatch = z.infer<typeof TokenPatchSchema>

@ApiTags('OCPI Tokens (CPO)')
@UseGuards(OcpiAuthGuard)
@OcpiEndpoint({
  identifier: 'tokens',
  version: '2.2.1',
  roles: ['cpo'],
})
@Controller('/ocpi/cpo/2.2.1/tokens')
export class TokensCpoController {
  readonly #svc: TokenService
  constructor(svc: TokenService) {
    this.#svc = svc
  }

  /**
   * GET /ocpi/cpo/2.2.1/tokens/{country_code}/{party_id}/{token_uid}[?type={type}]
   * Retrieve a Token as it is stored in the CPO system.
   */
  @ApiOperation({
    summary: 'Get Token',
    description: 'Retrieve a Token as it is stored in the CPO system.',
  })
  @ApiParam({
    name: 'countryCode',
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'NL',
  })
  @ApiParam({
    name: 'partyId',
    description: 'Party ID (3 characters)',
    example: 'TNM',
  })
  @ApiParam({
    name: 'tokenUid',
    description: 'Token UID (max 36 characters)',
    example: 'DEADBEEF',
  })
  @ApiQuery({
    name: 'type',
    description: 'Token type',
    enum: TokenType,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Token retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found',
  })
  @Get(':countryCode/:partyId/:tokenUid')
  async getToken(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenUid') tokenUid: string,
    @Query('type') type: TokenType = TokenType.RFID,
  ): Promise<OcpiResponse<TokenDto>> {
    // Validate URL parameters
    this.validateUrlParams(countryCode, partyId, tokenUid)

    const token = await this.#svc.getToken(countryCode, partyId, tokenUid, type)

    return createOcpiSuccessResponse(token.toDto())
  }

  /**
   * PUT /ocpi/cpo/2.2.1/tokens/{country_code}/{party_id}/{token_uid}
   * Push new/updated Token object to the CPO.
   */
  @ApiOperation({
    summary: 'Create or Update Token',
    description: 'Push new/updated Token object to the CPO.',
  })
  @ApiParam({
    name: 'countryCode',
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'NL',
  })
  @ApiParam({
    name: 'partyId',
    description: 'Party ID (3 characters)',
    example: 'TNM',
  })
  @ApiParam({
    name: 'tokenUid',
    description: 'Token UID (max 36 characters)',
    example: 'DEADBEEF',
  })
  @ApiResponse({
    status: 200,
    description: 'Token created or updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or token data',
  })
  @Put(':countryCode/:partyId/:tokenUid')
  @UsePipes(new ZodValidationPipe(TokenDtoSchema))
  async putToken(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenUid') tokenUid: string,
    @Body() tokenDto: TokenDto,
  ): Promise<OcpiResponse<void>> {
    // Validate URL parameters
    this.validateUrlParams(countryCode, partyId, tokenUid)

    // Validate DTO
    const validatedDto = TokenDtoSchema.parse(tokenDto)

    // Ensure URL parameters match DTO
    if (
      validatedDto.country_code !== countryCode ||
      validatedDto.party_id !== partyId ||
      validatedDto.uid !== tokenUid
    ) {
      throw new OcpiInvalidParametersException(
        'URL parameters must match token data in body',
      )
    }

    // Convert DTO to domain model
    const token = Token.fromDto(validatedDto)

    // Save token
    await this.#svc.createOrUpdateToken(token)

    return createOcpiSuccessResponse()
  }

  /**
   * PATCH /ocpi/cpo/2.2.1/tokens/{country_code}/{party_id}/{token_uid}
   * Notify the CPO of partial updates to a Token.
   */
  @ApiOperation({
    summary: 'Partially Update Token',
    description: 'Notify the CPO of partial updates to a Token.',
  })
  @ApiParam({
    name: 'countryCode',
    description: 'Country code (ISO 3166-1 alpha-2)',
    example: 'NL',
  })
  @ApiParam({
    name: 'partyId',
    description: 'Party ID (3 characters)',
    example: 'TNM',
  })
  @ApiParam({
    name: 'tokenUid',
    description: 'Token UID (max 36 characters)',
    example: 'DEADBEEF',
  })
  @ApiQuery({
    name: 'type',
    description: 'Token type',
    enum: TokenType,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Token updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters or patch data',
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found',
  })
  @Patch(':countryCode/:partyId/:tokenUid')
  async patchToken(
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('tokenUid') tokenUid: string,
    @Body() patchData: TokenPatch,
    @Query('type') type: TokenType = TokenType.RFID,
  ): Promise<OcpiResponse<void>> {
    // Validate URL parameters
    this.validateUrlParams(countryCode, partyId, tokenUid)

    // Validate patch data
    const validatedPatch = TokenPatchSchema.parse(patchData)

    // Update token
    await this.#svc.updateToken(countryCode, partyId, tokenUid, type, {
      valid: validatedPatch.valid,
      whitelist: validatedPatch.whitelist as WhitelistType,
      visualNumber: validatedPatch.visual_number,
      groupId: validatedPatch.group_id,
      language: validatedPatch.language,
    })

    return createOcpiSuccessResponse()
  }

  private validateUrlParams(
    countryCode: string,
    partyId: string,
    tokenUid: string,
  ): void {
    try {
      CountryCodeSchema.parse(countryCode)
      PartyIdSchema.parse(partyId)
      TokenUidSchema.parse(tokenUid)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new OcpiInvalidParametersException(error.issues[0].message)
      }
      throw error
    }
  }
}
