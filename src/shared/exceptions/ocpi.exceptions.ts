// src/shared/exceptions/ocpi.exceptions.ts
import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Base class for OCPI-compliant exceptions that includes both HTTP status codes
 * and OCPI status codes as defined in OCPI 2.2.1 specification section 5.
 */
export abstract class OcpiException extends HttpException {
  public readonly ocpiStatusCode: number
  public readonly timestamp: string

  constructor(
    message: string,
    httpStatusCode: HttpStatus,
    ocpiStatusCode: number,
  ) {
    super(
      {
        status_code: ocpiStatusCode,
        status_message: message,
        timestamp: new Date().toISOString(),
      },
      httpStatusCode,
    )
    this.ocpiStatusCode = ocpiStatusCode
    this.timestamp = new Date().toISOString()
  }
}

/**
 * OCPI Client Error (2xxx range) - Errors detected by the server in the message
 * sent by a client where the client did something wrong.
 */
export abstract class OcpiClientException extends OcpiException {
  constructor(message: string, ocpiStatusCode: number) {
    super(message, HttpStatus.BAD_REQUEST, ocpiStatusCode)
  }
}

/**
 * OCPI Server Error (3xxx range) - Error during processing of the OCPI payload
 * in the server. The message was syntactically correct but could not be processed.
 */
export abstract class OcpiServerException extends OcpiException {
  constructor(message: string, ocpiStatusCode: number) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ocpiStatusCode)
  }
}

/**
 * OCPI Hub Error (4xxx range) - Errors that a Hub encounters while routing messages.
 */
export abstract class OcpiHubException extends OcpiException {
  constructor(message: string, ocpiStatusCode: number) {
    super(message, HttpStatus.BAD_GATEWAY, ocpiStatusCode)
  }
}

// Specific OCPI Client Exceptions (2xxx)

/**
 * OCPI 2000 - Generic client error
 */
export class OcpiGenericClientException extends OcpiClientException {
  constructor(message = 'Generic client error') {
    super(message, 2000)
  }
}

/**
 * OCPI 2001 - Invalid or missing parameters
 */
export class OcpiInvalidParametersException extends OcpiClientException {
  constructor(message = 'Invalid or missing parameters') {
    super(message, 2001)
  }
}

/**
 * OCPI 2002 - Not enough information
 */
export class OcpiNotEnoughInformationException extends OcpiClientException {
  constructor(message = 'Not enough information') {
    super(message, 2002)
  }
}

/**
 * OCPI 2003 - Unknown Location
 */
export class OcpiUnknownLocationException extends OcpiClientException {
  constructor(message = 'Unknown Location') {
    super(message, 2003)
  }
}

/**
 * OCPI 2004 - Unknown Token
 */
export class OcpiUnknownTokenException extends OcpiClientException {
  constructor(message = 'Unknown Token') {
    super(message, 2004)
  }
}

// Specific OCPI Server Exceptions (3xxx)

/**
 * OCPI 3000 - Generic server error
 */
export class OcpiGenericServerException extends OcpiServerException {
  constructor(message = 'Generic server error') {
    super(message, 3000)
  }
}

/**
 * OCPI 3001 - Unable to use the client's API
 */
export class OcpiUnableToUseClientApiException extends OcpiServerException {
  constructor(message = "Unable to use the client's API") {
    super(message, 3001)
  }
}

/**
 * OCPI 3002 - Unsupported version
 */
export class OcpiUnsupportedVersionException extends OcpiServerException {
  constructor(message = 'Unsupported version') {
    super(message, 3002)
  }
}

/**
 * OCPI 3003 - No matching endpoints or expected endpoints missing
 */
export class OcpiNoMatchingEndpointsException extends OcpiServerException {
  constructor(
    message = 'No matching endpoints or expected endpoints missing between parties',
  ) {
    super(message, 3003)
  }
}

// Specific OCPI Hub Exceptions (4xxx)

/**
 * OCPI 4000 - Generic hub error
 */
export class OcpiGenericHubException extends OcpiHubException {
  constructor(message = 'Generic hub error') {
    super(message, 4000)
  }
}

/**
 * OCPI 4001 - Unknown receiver
 */
export class OcpiUnknownReceiverException extends OcpiHubException {
  constructor(message = 'Unknown receiver (TO address is unknown)') {
    super(message, 4001)
  }
}

/**
 * OCPI 4002 - Timeout on forwarded request
 */
export class OcpiTimeoutException extends OcpiHubException {
  constructor(message = 'Timeout on forwarded request') {
    super(message, 4002)
  }
}

/**
 * OCPI 4003 - Connection problem
 */
export class OcpiConnectionProblemException extends OcpiHubException {
  constructor(
    message = 'Connection problem (receiving party is not connected)',
  ) {
    super(message, 4003)
  }
}
