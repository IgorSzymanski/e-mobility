import { z } from 'zod'
import {
  TokenType,
  WhitelistType,
  AllowedType,
} from '../../../../domain/tokens/enums/token-enums'

// OCPI Token DTO Schema
export const TokenDtoSchema = z.object({
  country_code: z.string().length(2),
  party_id: z.string().length(3),
  uid: z.string().min(1).max(36),
  type: z.enum(TokenType),
  contract_id: z.string().min(1).max(36),
  visual_number: z.string().max(64).optional(),
  issuer: z.string().min(1).max(64),
  group_id: z.string().max(36).optional(),
  valid: z.boolean(),
  whitelist: z.enum(WhitelistType),
  language: z.string().length(2).optional(),
  default_profile_type: z.string().optional(), // ProfileType enum not implemented yet
  energy_contract: z
    .object({
      supplier_name: z.string().max(64),
      contract_id: z.string().max(64).optional(),
    })
    .optional(),
  last_updated: z.string().datetime(),
})

export type TokenDto = z.infer<typeof TokenDtoSchema>

// LocationReferences DTO Schema
export const LocationReferencesDtoSchema = z.object({
  location_id: z.string().min(1).max(36),
  evse_uids: z.array(z.string().min(1).max(36)).optional(),
})

export type LocationReferencesDto = z.infer<typeof LocationReferencesDtoSchema>

// AuthorizationInfo DTO Schema
export const AuthorizationInfoDtoSchema = z.object({
  allowed: z.enum(AllowedType),
  token: TokenDtoSchema,
  location: LocationReferencesDtoSchema.optional(),
  authorization_reference: z.string().min(1).max(36).optional(),
  info: z
    .object({
      language: z.string().length(2),
      text: z.string().min(1),
    })
    .optional(),
})

export type AuthorizationInfoDto = z.infer<typeof AuthorizationInfoDtoSchema>

// Request/Response DTOs
export const AuthorizeRequestDtoSchema = LocationReferencesDtoSchema.optional()
export type AuthorizeRequestDto = z.infer<typeof AuthorizeRequestDtoSchema>

// Token list query parameters
export const TokenListQuerySchema = z.object({
  date_from: z.iso.datetime().optional(),
  date_to: z.iso.datetime().optional(),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().max(1000).optional(),
})

export type TokenListQuery = z.infer<typeof TokenListQuerySchema>
