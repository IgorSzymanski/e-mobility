export type OcpiStatusCode =
  | 1000
  | 2000
  | 2001
  | 2002
  | 2003
  | 2004
  | 3000
  | 3001
  | 3002
  | 3003
  | 4000
  | 4001
  | 4002
  | 4003

export type OcpiResponse<T> = Readonly<{
  data?: T
  status_code: OcpiStatusCode
  status_message?: string
  timestamp: string
}>

/**
 * Creates an OCPI-compliant response object according to OCPI 2.2.1 specification
 * section 4.1.7 Response format
 */
export function createOcpiResponse<T>(
  data?: T,
  statusCode: OcpiStatusCode = 1000,
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
  statusCode: OcpiStatusCode,
  statusMessage: string,
): OcpiResponse<null> {
  // According to OCPI spec, error responses may omit data field or set it to null
  // But for consistency, we'll include it as null
  return {
    data: null,
    status_code: statusCode,
    status_message: statusMessage,
    timestamp: new Date().toISOString(),
  }
}
