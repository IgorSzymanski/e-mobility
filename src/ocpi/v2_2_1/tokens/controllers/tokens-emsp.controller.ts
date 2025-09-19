import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { z } from 'zod'
import { TokenService } from '../services/token.service'
import { TokenType } from '@/domain/tokens/enums/token-enums'
import { LocationReferences } from '@/domain/tokens/value-objects/location-references'
import type {
  TokenDto,
  AuthorizeRequestDto,
  AuthorizationResponseDto,
  TokenListQuery,
} from '../dto/token.dto'
import {
  TokenListQuerySchema,
  AuthorizeRequestDtoSchema,
} from '../dto/token.dto'
import type { OcpiResponse } from '@/ocpi/v2_2_1/common/ocpi-envelope'
import { createOcpiSuccessResponse } from '@/ocpi/v2_2_1/common/ocpi-envelope'
import { OcpiEndpoint } from '@/ocpi/common/decorators/ocpi-endpoint.decorator'
import { OcpiAuthGuard } from '@/ocpi/common/guards/ocpi-auth.guard'
import { OcpiInvalidParametersException } from '@/shared/exceptions/ocpi.exceptions'
import { ZodValidationPipe } from 'nestjs-zod'

// URL parameter validation
const TokenUidSchema = z
  .string()
  .min(1, 'Token UID cannot be empty')
  .max(36, 'Token UID must be max 36 characters')

@UseGuards(OcpiAuthGuard)
@OcpiEndpoint({
  identifier: 'tokens',
  version: '2.2.1',
  roles: ['emsp'],
})
@Controller('/ocpi/emsp/2.2.1/tokens')
export class TokensEmspController {
  readonly #svc: TokenService
  constructor(svc: TokenService) {
    this.#svc = svc
  }

  /**
   * GET /ocpi/emsp/2.2.1/tokens?[date_from={date_from}][&date_to={date_to}][&offset={offset}][&limit={limit}]
   * Get list of all tokens, or a filtered list of tokens.
   */
  @Get()
  @UsePipes(new ZodValidationPipe(TokenListQuerySchema))
  async getTokens(
    @Query() query: TokenListQuery = {},
  ): Promise<OcpiResponse<TokenDto[]>> {
    const params = {
      dateFrom: query.date_from ? new Date(query.date_from) : undefined,
      dateTo: query.date_to ? new Date(query.date_to) : undefined,
      offset: query.offset ?? 0,
      limit: query.limit ?? 100,
    }

    const result = await this.#svc.getTokens(params)

    return createOcpiSuccessResponse(
      result.tokens.map((token) => token.toDto()),
    )
  }

  /**
   * POST /ocpi/emsp/2.2.1/tokens/{token_uid}/authorize[?type={type}]
   * Real-time authorization request for the given Token uid.
   */
  @Post(':tokenUid/authorize')
  @UsePipes(new ZodValidationPipe(AuthorizeRequestDtoSchema))
  async authorizeToken(
    @Param('tokenUid') tokenUid: string,
    @Query('type') type: TokenType = TokenType.RFID,
    @Body() request?: AuthorizeRequestDto,
  ): Promise<OcpiResponse<AuthorizationResponseDto>> {
    // Validate token UID parameter
    this.validateTokenUid(tokenUid)

    // Convert optional request body to domain object
    const locationRef = request
      ? new LocationReferences(request.location_id, request.evse_uids)
      : undefined

    const authInfo = await this.#svc.authorizeToken(tokenUid, type, locationRef)

    // Convert AuthorizationInfo to response DTO
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tokenData = authInfo.token as any
    const response: AuthorizationResponseDto = {
      allowed: authInfo.allowed,
      token: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        country_code: tokenData.id.countryCode,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        party_id: tokenData.id.partyId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        uid: tokenData.id.uid,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        type: tokenData.type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        contract_id: tokenData.contractId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        visual_number: tokenData.visualNumber,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        issuer: tokenData.issuer,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        group_id: tokenData.groupId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        valid: tokenData.valid,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        whitelist: tokenData.whitelist,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        language: tokenData.language,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        last_updated: tokenData.lastUpdated.toISOString(),
      },
      location: authInfo.location
        ? {
            location_id: authInfo.location.locationId,
            evse_uids: authInfo.location.evseUids,
          }
        : undefined,
      authorization_reference: authInfo.authorizationReference,
      info: authInfo.info,
    }

    return createOcpiSuccessResponse(response)
  }

  private validateTokenUid(tokenUid: string): void {
    try {
      TokenUidSchema.parse(tokenUid)
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new OcpiInvalidParametersException(error.issues[0].message)
      }
      throw error
    }
  }
}
