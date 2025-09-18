import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const OcpiRoleSchema = z.enum(['cpo', 'emsp'])

const OcpiVersionSchema = z.enum(['2.2.1', '2.3.0'])

const RoleParamSchema = z.object({
  role: OcpiRoleSchema,
})

const VersionDetailsQuerySchema = z.object({
  version: OcpiVersionSchema,
})

export class RoleParamDto extends createZodDto(RoleParamSchema) {}
export class VersionDetailsQueryDto extends createZodDto(
  VersionDetailsQuerySchema,
) {}

export const ocpiRoleSchema = OcpiRoleSchema
export const ocpiVersionSchema = OcpiVersionSchema
