import {
  Controller,
  Put,
  Patch,
  Param,
  Body,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { EmpLocationService } from '@/domain/locations/services/emp-location.service'
import type { LocationObjectQueryDto } from '../../common/locations/dto/location-query.dto'
import type { OcpiResponse } from '../../common/ocpi-envelope'
import type {
  LocationDto,
  EvseDto,
  ConnectorDto,
} from '../../common/locations/dto/location.dto'
import { LocationMapper } from '../../common/locations/dto/location.dto'
import { createOcpiSuccessResponse } from '../../common/ocpi-envelope'
import { OcpiAuthGuard } from '@/ocpi/common/guards/ocpi-auth.guard'
import { OcpiContextInterceptor } from '@/ocpi/common/interceptors/ocpi-context.interceptor'
import { OcpiEndpoint } from '@/ocpi/common/decorators/ocpi-endpoint.decorator'
import { OcpiPartyParam } from '@/ocpi/common/decorators/ocpi-party.decorator'
import type { OcpiParty } from '@/ocpi/common/services/ocpi-token-validation.service'
import { OcpiInvalidParametersException } from '@/shared/exceptions/ocpi.exceptions'

@ApiTags('EMP Locations')
@UseGuards(OcpiAuthGuard)
@UseInterceptors(OcpiContextInterceptor)
@OcpiEndpoint({
  identifier: 'locations',
  version: '2.2.1',
  roles: ['emsp'],
})
@Controller('ocpi/emsp/2.2.1/locations')
export class LocationsController {
  constructor(private readonly empLocationService: EmpLocationService) {}

  @Put(':location_id')
  @ApiOperation({ summary: 'Create or update a location' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location created or updated successfully',
  })
  async putLocation(
    @Param() params: LocationObjectQueryDto,
    @Body() locationDto: LocationDto,
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<LocationDto>> {
    // Validate that location_id in URL matches the one in the body
    if (params.location_id !== locationDto.id) {
      throw new OcpiInvalidParametersException(
        `Location ID mismatch: URL has '${params.location_id}', body has '${locationDto.id}'`,
      )
    }

    // Convert DTO to domain object
    const location = LocationMapper.toDomain(locationDto)

    // Delegate to domain service
    const savedLocation = await this.empLocationService.createOrUpdateLocation({
      locationData: location,
      countryCode: party.countryCode,
      partyId: party.partyId,
    })

    // Convert back to DTO for response
    const responseDto = LocationMapper.fromDomain(
      savedLocation,
      party.countryCode,
      party.partyId,
    )

    return createOcpiSuccessResponse(responseDto)
  }

  @Patch(':location_id')
  @ApiOperation({ summary: 'Partially update a location' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Location updated successfully',
  })
  async patchLocation(
    @Param() params: LocationObjectQueryDto,
    @Body() partialLocationDto: Partial<LocationDto>,
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<LocationDto>> {
    // Convert partial DTO to domain partial (this would need proper implementation)
    // TODO: Implement proper partial mapping from DTO to domain
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const partialDomainData = partialLocationDto as any

    // Delegate to domain service
    const updatedLocation = await this.empLocationService.updateLocationPartial(
      {
        locationId: params.location_id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        partialData: partialDomainData,
        countryCode: party.countryCode,
        partyId: party.partyId,
      },
    )

    // Convert back to DTO for response
    const responseDto = LocationMapper.fromDomain(
      updatedLocation,
      party.countryCode,
      party.partyId,
    )

    return createOcpiSuccessResponse(responseDto)
  }

  @Put(':location_id/evses/:evse_uid')
  @ApiOperation({ summary: 'Create or update an EVSE' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'EVSE created or updated successfully',
  })
  async putEvse(
    @Param() params: LocationObjectQueryDto & { evse_uid: string },
    @Body() evseDto: EvseDto,
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<LocationDto>> {
    // Convert DTO to domain EVSE object
    // TODO: Implement EvseMapper.toDomain and proper EVSE type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const evse = {} as any // Placeholder for EVSE domain object

    // Delegate to domain service
    const updatedLocation = await this.empLocationService.updateEvse({
      countryCode: party.countryCode,
      partyId: party.partyId,
      locationId: params.location_id,
      evseUid: params.evse_uid,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      evse,
    })

    // Convert back to DTO for response
    const responseDto = LocationMapper.fromDomain(
      updatedLocation,
      party.countryCode,
      party.partyId,
    )

    return createOcpiSuccessResponse(responseDto)
  }

  @Put(':location_id/evses/:evse_uid/connectors/:connector_id')
  @ApiOperation({ summary: 'Create or update a connector' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Connector created or updated successfully',
  })
  async putConnector(
    @Param()
    params: LocationObjectQueryDto & { evse_uid: string; connector_id: string },
    @Body() connectorDto: ConnectorDto,
    @OcpiPartyParam() party: OcpiParty,
  ): Promise<OcpiResponse<LocationDto>> {
    // Convert DTO to domain Connector object
    // TODO: Implement ConnectorMapper.toDomain and proper Connector type
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const connector = {} as any // Placeholder for Connector domain object

    // Delegate to domain service
    const updatedLocation = await this.empLocationService.updateConnector({
      countryCode: party.countryCode,
      partyId: party.partyId,
      locationId: params.location_id,
      evseUid: params.evse_uid,
      connectorId: params.connector_id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      connector,
    })

    // Convert back to DTO for response
    const responseDto = LocationMapper.fromDomain(
      updatedLocation,
      party.countryCode,
      party.partyId,
    )

    return createOcpiSuccessResponse(responseDto)
  }
}
