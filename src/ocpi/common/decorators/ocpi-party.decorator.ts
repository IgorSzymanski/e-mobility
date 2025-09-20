import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import type { OcpiParty } from '../services/ocpi-token-validation.service'

interface RequestWithOcpiAuth extends Request {
  ocpiParty?: OcpiParty
  credentialsToken?: string
}

/**
 * Parameter decorator that extracts the authenticated OCPI party from the request
 * Throws an error if no party information is available
 *
 * Usage: @OcpiPartyParam() party: OcpiParty
 */
export const OcpiPartyParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OcpiParty => {
    const request = ctx.switchToHttp().getRequest<RequestWithOcpiAuth>()

    if (!request.ocpiParty) {
      throw new Error(
        'No OCPI party information found in request. Ensure OcpiAuthGuard is applied.',
      )
    }

    return request.ocpiParty
  },
)

/**
 * Parameter decorator that extracts the credentials token from the request
 *
 * Usage: @CredentialsTokenParam() token: string
 */
export const CredentialsTokenParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithOcpiAuth>()

    if (!request.credentialsToken) {
      throw new Error('No credentials token found in request.')
    }

    return request.credentialsToken
  },
)

/**
 * Parameter decorator that validates party access to URL parameters
 * This ensures that the authenticated party can only access their own resources
 *
 * Usage: @ValidatedPartyParam() party: OcpiParty
 */
export const ValidatedPartyParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OcpiParty => {
    const request = ctx.switchToHttp().getRequest<RequestWithOcpiAuth>()

    if (!request.ocpiParty) {
      throw new Error(
        'No OCPI party information found in request. Ensure OcpiAuthGuard is applied.',
      )
    }

    // Extract country_code and party_id from URL parameters
    const countryCode =
      request.params.country_code || request.params.countryCode
    const partyId = request.params.party_id || request.params.partyId

    // If URL contains party parameters, validate access
    if (countryCode && partyId) {
      if (
        request.ocpiParty.countryCode !== countryCode ||
        request.ocpiParty.partyId !== partyId
      ) {
        throw new Error(
          `Unauthorized: Party ${request.ocpiParty.countryCode}*${request.ocpiParty.partyId} cannot access resources for ${countryCode}*${partyId}`,
        )
      }
    }

    return request.ocpiParty
  },
)
