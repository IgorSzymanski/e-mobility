// src/shared/filters/ocpi-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import { ZodError } from 'zod'
import { ZodSerializationException } from 'nestjs-zod'
import { OcpiException } from '@/shared/exceptions/ocpi.exceptions'
import { createOcpiErrorResponse } from '@/ocpi/v2_2_1/common/ocpi-envelope'

/**
 * Global exception filter that ensures all OCPI endpoints return
 * OCPI-compliant error responses according to OCPI 2.2.1 specification
 */
@Catch()
export class OcpiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(OcpiExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()

    // Only apply OCPI formatting to OCPI endpoints
    const isOcpiEndpoint = request.url?.startsWith('/ocpi/')

    if (!isOcpiEndpoint) {
      // For non-OCPI endpoints, let the default exception filter handle it
      if (exception instanceof HttpException) {
        return response
          .status(exception.getStatus())
          .json(exception.getResponse())
      }

      // For unknown errors on non-OCPI endpoints
      this.logger.error('Unexpected error on non-OCPI endpoint', exception)
      return response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
      })
    }

    // OCPI endpoint error handling
    let statusCode: number
    let httpStatusCode: number
    let message: string

    if (exception instanceof OcpiException) {
      // Already an OCPI-compliant exception
      statusCode = exception.ocpiStatusCode
      httpStatusCode = exception.getStatus()
      message = exception.message
    } else if (exception instanceof ZodSerializationException) {
      // Zod validation errors
      statusCode = 2001 // Invalid parameters
      httpStatusCode = 400
      const zodError = exception.getZodError()
      if (zodError instanceof ZodError) {
        message = `Validation failed: ${zodError.issues.map((i) => i.message).join(', ')}`
      } else {
        message = 'Validation failed'
      }
    } else if (exception instanceof BadRequestException) {
      // NestJS validation errors (from Zod pipe)
      statusCode = 2001 // Invalid parameters
      httpStatusCode = 400
      const response = exception.getResponse()
      if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        message = Array.isArray(response.message)
          ? response.message.join(', ')
          : (response.message as string)
      } else {
        message = 'Invalid parameters'
      }
    } else if (exception instanceof NotFoundException) {
      // NestJS not found errors
      statusCode = 2003 // Unknown location
      httpStatusCode = 404
      message = exception.message || 'Resource not found'
    } else if (exception instanceof HttpException) {
      // Other HTTP exceptions
      httpStatusCode = exception.getStatus()
      const exceptionResponse = exception.getResponse()

      if (httpStatusCode >= 400 && httpStatusCode < 500) {
        statusCode = 2000 // Generic client error
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any)?.message || 'Client error'
      } else {
        statusCode = 3000 // Generic server error
        message =
          typeof exceptionResponse === 'string'
            ? exceptionResponse
            : (exceptionResponse as any)?.message || 'Server error'
      }
    } else {
      // Unknown errors
      this.logger.error('Unexpected error on OCPI endpoint', exception)
      statusCode = 3000 // Generic server error
      httpStatusCode = 500
      message = 'Internal server error'
    }

    // Return OCPI-compliant error response
    const ocpiResponse = createOcpiErrorResponse(statusCode, message)

    return response
      .status(httpStatusCode)
      .header('Content-Type', 'application/json')
      .json(ocpiResponse)
  }
}
