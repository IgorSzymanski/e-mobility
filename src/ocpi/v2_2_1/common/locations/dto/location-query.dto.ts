import { z } from 'zod'

// OCPI 2.2.1 Location List Query Parameters
export const LocationListQuerySchema = z.object({
  date_from: z.iso.datetime().optional(),
  date_to: z.iso.datetime().optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

// Location Object Query Parameters (for GET single location/evse/connector)
export const LocationObjectQuerySchema = z.object({
  location_id: z.string().max(36),
  evse_uid: z.string().max(36).optional(),
  connector_id: z.string().max(36).optional(),
})

// Location Receiver Query Parameters (for EMP interface)
export const LocationReceiverQuerySchema = z.object({
  country_code: z.string().length(2),
  party_id: z.string().length(3),
  location_id: z.string().max(36),
  evse_uid: z.string().max(36).optional(),
  connector_id: z.string().max(36).optional(),
})

// PATCH request validation schema for partial updates
export const LocationPatchSchema = z.object({
  publish: z.boolean().optional(),
  name: z.string().max(255).optional(),
  address: z.string().max(45).optional(),
  city: z.string().max(45).optional(),
  postal_code: z.string().max(10).optional(),
  state: z.string().max(20).optional(),
  parking_type: z
    .enum([
      'ALONG_MOTORWAY',
      'PARKING_GARAGE',
      'PARKING_LOT',
      'ON_DRIVEWAY',
      'ON_STREET',
      'UNDERGROUND_GARAGE',
    ])
    .optional(),
  charging_when_closed: z.boolean().optional(),
  last_updated: z.iso.datetime(), // Required for PATCH operations per OCPI spec
})

// EVSE PATCH request validation schema
export const EvsePatchSchema = z.object({
  status: z
    .enum([
      'AVAILABLE',
      'BLOCKED',
      'CHARGING',
      'INOPERATIVE',
      'OUTOFORDER',
      'PLANNED',
      'REMOVED',
      'RESERVED',
      'UNKNOWN',
    ])
    .optional(),
  capabilities: z
    .array(
      z.enum([
        'CHARGING_PROFILE_CAPABLE',
        'CHARGING_PREFERENCES_CAPABLE',
        'CHIP_CARD_SUPPORT',
        'CONTACTLESS_CARD_SUPPORT',
        'CREDIT_CARD_PAYABLE',
        'DEBIT_CARD_PAYABLE',
        'PED_TERMINAL',
        'REMOTE_START_STOP_CAPABLE',
        'RESERVABLE',
        'RFID_READER',
        'START_SESSION_CONNECTOR_REQUIRED',
        'TOKEN_GROUP_CAPABLE',
        'UNLOCK_CAPABLE',
      ]),
    )
    .optional(),
  floor_level: z.string().max(4).optional(),
  physical_reference: z.string().max(16).optional(),
  last_updated: z.iso.datetime(), // Required for PATCH operations per OCPI spec
})

// Connector PATCH request validation schema
export const ConnectorPatchSchema = z.object({
  max_voltage: z.number().int().optional(),
  max_amperage: z.number().int().optional(),
  max_electric_power: z.number().int().optional(),
  tariff_ids: z.array(z.string().max(36)).optional(),
  terms_and_conditions: z.url().optional(),
  last_updated: z.iso.datetime(), // Required for PATCH operations per OCPI spec
})

// Type exports
export type LocationListQueryDto = z.infer<typeof LocationListQuerySchema>
export type LocationObjectQueryDto = z.infer<typeof LocationObjectQuerySchema>
export type LocationReceiverQueryDto = z.infer<
  typeof LocationReceiverQuerySchema
>
export type LocationPatchDto = z.infer<typeof LocationPatchSchema>
export type EvsePatchDto = z.infer<typeof EvsePatchSchema>
export type ConnectorPatchDto = z.infer<typeof ConnectorPatchSchema>

// Validation helpers
export const validateLocationListQuery = (
  query: unknown,
): LocationListQueryDto => {
  return LocationListQuerySchema.parse(query)
}

export const validateLocationObjectQuery = (
  params: unknown,
): LocationObjectQueryDto => {
  return LocationObjectQuerySchema.parse(params)
}

export const validateLocationReceiverQuery = (
  params: unknown,
): LocationReceiverQueryDto => {
  return LocationReceiverQuerySchema.parse(params)
}

export const validateLocationPatch = (body: unknown): LocationPatchDto => {
  return LocationPatchSchema.parse(body)
}

export const validateEvsePatch = (body: unknown): EvsePatchDto => {
  return EvsePatchSchema.parse(body)
}

export const validateConnectorPatch = (body: unknown): ConnectorPatchDto => {
  return ConnectorPatchSchema.parse(body)
}
