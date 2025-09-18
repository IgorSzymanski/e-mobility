// ocpi/v2_2_1/common/ocpi-envelope.ts
export type OcpiResponse<T> = Readonly<{
  data?: T
  status_code: number
  status_message?: string
  timestamp: string
}>

/**
 * Creates an OCPI-compliant response object according to OCPI 2.2.1 specification
 * section 4.1.7 Response format
 */
export function createOcpiResponse<T>(
  data?: T,
  statusCode = 1000,
  statusMessage = 'Success',
): OcpiResponse<T> {
  return {
    data,
    status_code: statusCode,
    status_message: statusMessage,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Creates an OCPI-compliant success response
 */
export function createOcpiSuccessResponse<T>(data?: T): OcpiResponse<T> {
  return createOcpiResponse(data, 1000, 'Success')
}

/**
 * Creates an OCPI-compliant error response
 */
export function createOcpiErrorResponse(
  statusCode: number,
  statusMessage: string,
): OcpiResponse<null> {
  // According to OCPI spec, error responses may omit data field or set it to null
  // But for consistency, we'll include it as null
  return {
    data: null,
    status_code: statusCode,
    status_message: statusMessage,
    timestamp: new Date().toISOString(),
  } as OcpiResponse<null>
}
