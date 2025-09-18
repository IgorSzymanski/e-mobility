import { SetMetadata } from '@nestjs/common'
import { SKIP_OCPI_AUTH_KEY } from '../guards/ocpi-auth.guard'

/**
 * Decorator to skip OCPI authorization for specific endpoints
 * Used for configuration modules like credentials and versions
 */
export const SkipOcpiAuth = () => SetMetadata(SKIP_OCPI_AUTH_KEY, true)
