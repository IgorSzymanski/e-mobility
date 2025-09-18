import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class OcpiConfigService {
  constructor(private configService: ConfigService) {}

  get baseUrl(): string {
    return this.configService.get<string>(
      'OCPI_BASE_URL',
      'https://localhost:3000',
    )
  }

  /**
   * Generate OCPI endpoint URL
   * @param role - OCPI role (emsp, cpo)
   * @param version - OCPI version (2.2.1, 2.3.0)
   * @param endpoint - Endpoint name (versions, credentials, etc.)
   */
  getEndpointUrl(role: string, version: string, endpoint: string): string {
    return `${this.baseUrl}/ocpi/${role}/${version}/${endpoint}`
  }
}
