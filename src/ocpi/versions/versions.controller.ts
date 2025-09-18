// src/ocpi/versions/versions.controller.ts
import { Controller, Get, Query, Param } from '@nestjs/common'
import { VersionRegistryService, OcpiRole } from './version-registry'
import type { RoleParamDto, VersionDetailsQueryDto } from './dto/versions.dto'
import { createOcpiSuccessResponse } from '@/ocpi/v2_2_1/common/ocpi-envelope'
import {
  OcpiInvalidParametersException,
  OcpiUnknownLocationException,
} from '@/shared/exceptions/ocpi.exceptions'

@Controller('/ocpi/:role')
export class VersionsController {
  constructor(private readonly versionRegistry: VersionRegistryService) {}
  @Get('/versions')
  listVersions(@Param() params: RoleParamDto) {
    const { role } = params
    const versionCatalog = this.versionRegistry.getVersionCatalog()
    const roleVersions = versionCatalog[role as OcpiRole]

    if (!roleVersions) {
      throw new OcpiInvalidParametersException(`Invalid role: ${role}`)
    }

    const data = roleVersions.map((versionDetail) => ({
      version: versionDetail.version,
      url: `/ocpi/${role}/version_details?version=${versionDetail.version}`,
    }))

    return createOcpiSuccessResponse(data)
  }

  @Get('/version_details')
  getVersionDetails(
    @Param() params: RoleParamDto,
    @Query() query: VersionDetailsQueryDto,
  ) {
    const { role } = params
    const { version } = query

    const versionCatalog = this.versionRegistry.getVersionCatalog()
    const roleVersions = versionCatalog[role as OcpiRole]
    const versionDetails = roleVersions.find((v) => v.version === version)

    if (!versionDetails) {
      throw new OcpiUnknownLocationException(
        `Version ${version} not found for role ${role}`,
      )
    }

    const data = {
      version: versionDetails.version,
      endpoints: versionDetails.endpoints,
    }

    return createOcpiSuccessResponse(data)
  }
}
