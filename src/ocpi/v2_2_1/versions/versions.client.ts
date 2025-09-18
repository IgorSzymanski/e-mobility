// ocpi/v2_2_1/versions/versions.client.ts
import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'
import z from 'zod'
import { assertResponse } from '@/shared/utils'
import {
  OcpiNoMatchingEndpointsException,
  OcpiUnsupportedVersionException,
  OcpiUnknownTokenException,
  OcpiUnknownLocationException,
  OcpiUnableToUseClientApiException,
} from '@/shared/exceptions/ocpi.exceptions'
import { AxiosError } from 'axios'

@Injectable()
export class VersionsClient221 {
  readonly #http: HttpService
  constructor(http: HttpService) {
    this.#http = http
  }

  async negotiateWithPeer(peer: {
    ourTokenForPeer: string
    baseVersionsUrl: string
  }) {
    try {
      // Use B to call their /versions:
      const auth = `Token ${Buffer.from(peer.ourTokenForPeer, 'utf8').toString('base64')}`
      const result = await firstValueFrom(
        this.#http.get(peer.baseVersionsUrl, {
          headers: { Authorization: auth, Accept: 'application/json' },
          timeout: 10000,
        }),
      )

      assertResponse(
        result,
        z.object({
          data: z.array(
            z.object({
              version: z.string(),
              url: z.string(),
            }),
          ),
        }),
      )

      const { data: versions } = result

      // Pick highest mutual (e.g., prefer 2.3.0 then 2.2.1)
      const chosen =
        versions.data.find((v) => v.version === '2.3.0') ??
        versions.data.find((v) => v.version === '2.2.1')

      if (!chosen) {
        throw new OcpiUnsupportedVersionException(
          'No compatible OCPI version found (2.2.1 or 2.3.0)',
        )
      }

      // Fetch version_details.endpoints
      const versionDetailsResult = await firstValueFrom(
        this.#http.get(chosen.url, {
          headers: { Authorization: auth, Accept: 'application/json' },
          timeout: 10000,
        }),
      )

      assertResponse(
        versionDetailsResult,
        z.object({
          data: z.object({
            endpoints: z.array(z.any()),
          }),
        }),
      )

      const { data: details } = versionDetailsResult

      return Object.freeze({
        version: chosen.version,
        endpoints: details.data.endpoints,
      })
    } catch (error: unknown) {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status
        const responseData = error.response?.data as
          | { status_message?: string }
          | undefined
        const message = responseData?.status_message || error.message

        if (statusCode === 401 || statusCode === 403) {
          throw new OcpiUnknownTokenException('Authentication failed with peer')
        } else if (statusCode === 404) {
          throw new OcpiUnknownLocationException('Peer endpoint not found')
        } else if (statusCode && statusCode >= 500) {
          throw new OcpiUnableToUseClientApiException(
            `Peer server error: ${message}`,
          )
        } else {
          throw new OcpiNoMatchingEndpointsException(
            `Network error during version negotiation: ${message}`,
          )
        }
      }

      throw error
    }
  }
}
