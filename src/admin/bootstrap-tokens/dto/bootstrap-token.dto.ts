// admin/bootstrap-tokens/dto/bootstrap-token.dto.ts
import { z } from 'zod'

export const CreateBootstrapTokenSchema = z.object({
  description: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
})

export const DeactivateBootstrapTokenSchema = z.object({
  id: z.string(),
})

export type CreateBootstrapTokenDto = z.infer<typeof CreateBootstrapTokenSchema>
export type DeactivateBootstrapTokenDto = z.infer<
  typeof DeactivateBootstrapTokenSchema
>
