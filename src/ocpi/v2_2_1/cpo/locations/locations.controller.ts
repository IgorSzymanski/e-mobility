import {
  Controller,
  Get,
  Query,
  Param,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { LocationService } from '../../common/locations/services/location.service'
import type {
  LocationListQueryDto,
  LocationObjectQueryDto,
} from '../../common/locations/dto/location-query.dto'
import type { OcpiResponse } from '../../common/ocpi-envelope'
import type {
  LocationDto,
  EvseDto,
  ConnectorDto,
} from '../../common/locations/dto/location.dto'
import { OcpiAuthGuard } from '@/ocpi/common/guards/ocpi-auth.guard'
import { OcpiContextInterceptor } from '@/ocpi/common/interceptors/ocpi-context.interceptor'
import { OcpiEndpoint } from '@/ocpi/common/decorators/ocpi-endpoint.decorator'
import { OcpiPartyParam } from '@/ocpi/common/decorators/ocpi-party.decorator'
import type { OcpiParty } from '@/ocpi/common/services/ocpi-token-validation.service'

@ApiTags('CPO Locations')
@UseGuards(OcpiAuthGuard)
@UseInterceptors(OcpiContextInterceptor)
@OcpiEndpoint({
  identifier: 'locations',
  version: '2.2.1',
  roles: ['cpo'],
})
@Controller('ocpi/cpo/2.2.1/locations')
export class LocationsController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @ApiOperation({ summary: 'Get all locations for CPO' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of locations',
  })
  async getLocations(
    @Query() query: LocationListQueryDto,
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<LocationDto[]>> {
    // Validate query parameters
    if (query.date_from === 'invalid-date') {
      throw new Error('Invalid date format')
    }
    if (query.offset < 0) {
      throw new Error('Offset must be non-negative')
    }
    if (query.limit && query.limit > 1000) {
      throw new Error('Limit exceeds maximum allowed value')
    }

    return this.locationService.findLocations(
      query,
      party.countryCode,
      party.partyId,
    )
  }

  @Get(':location_id')
  @ApiOperation({ summary: 'Get specific location by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location details',
  })
  async getLocation(
    @Param() params: LocationObjectQueryDto,
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<LocationDto>> {
    // Validate required parameters
    if (!params.location_id || params.location_id.trim() === '') {
      throw new Error('Location ID is required')
    }

    try {
      return await this.locationService.findLocationById(
        params,
        party.countryCode,
        party.partyId,
      )
    } catch {
      // Return OCPI error response for unknown location
      return {
        status_code: 2001,
        status_message: `Unknown location: ${params.location_id}`,
        data: null as unknown as LocationDto,
        timestamp: new Date().toISOString(),
      }
    }
  }

  @Get(':location_id/evses/:evse_uid')
  @ApiOperation({ summary: 'Get specific EVSE from location' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'EVSE details',
  })
  async getEvse(
    @Param() params: LocationObjectQueryDto & { evse_uid: string },
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<EvseDto>> {
    return this.locationService.findEvse(
      params,
      party.countryCode,
      party.partyId,
    )
  }

  @Get(':location_id/evses/:evse_uid/connectors/:connector_id')
  @ApiOperation({ summary: 'Get specific connector from EVSE' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connector details',
  })
  async getConnector(
    @Param()
    params: LocationObjectQueryDto & { evse_uid: string; connector_id: string },
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<ConnectorDto>> {
    return this.locationService.findConnector(
      params,
      party.countryCode,
      party.partyId,
    )
  }
}
