// ocpi/v2_2_1/credentials/dto/credentials.dto.ts
import { z } from 'zod'

export const CredentialsLogoSchema = z
  .object({
    url: z.string(),
    thumbnail: z.string().optional(),
    category: z.string().optional(),
    type: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
  })
  .strict()

export const CredentialsBusinessDetailsSchema = z
  .object({
    name: z.string(),
    website: z.string().optional(),
    logo: CredentialsLogoSchema.optional(),
  })
  .strict()

export const CredentialsRoleSchema = z
  .object({
    role: z.enum(['CPO', 'EMSP', 'HUB']),
    party_id: z.string(),
    country_code: z.string(),
    business_details: CredentialsBusinessDetailsSchema.optional(),
  })
  .strict()

export const CredentialsSchema = z
  .transform((a) => {
    // console.log('CredentialsSchema', a)
    return a
  })
  .pipe(
    z
      .object({
        token: z.string(), // printable ASCII, sent Base64-encoded in header when used
        url: z.string(), // absolute /versions URL
        roles: z.array(CredentialsRoleSchema).readonly(),
      })
      .strict(),
  )

export type CredentialsRoleDto = z.infer<typeof CredentialsRoleSchema>
export type CredentialsDto = z.infer<typeof CredentialsSchema>
