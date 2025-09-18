import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '@/app.module'

describe('OCPI Versions Controller (e2e)', () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  /**
   * Helper function to validate OCPI response format
   */
  const expectOcpiResponse = (response: any, expectedStatusCode = 1000) => {
    expect(response).toMatchObject({
      status_code: expectedStatusCode,
      timestamp: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/,
      ),
    })
    expect(response).toHaveProperty('data')

    // Validate timestamp is recent (within last 5 seconds)
    const responseTime = new Date(response.timestamp)
    const now = new Date()
    const diffMs = now.getTime() - responseTime.getTime()
    expect(diffMs).toBeLessThan(5000)
  }

  describe('/ocpi/:role/versions (GET)', () => {
    it('should return OCPI-compliant versions for valid EMSP role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/versions')
        .expect(200)
        .expect((res: request.Response) => {
          expectOcpiResponse(res.body)
          expect(res.body.data).toEqual([
            {
              version: '2.3.0',
              url: '/ocpi/emsp/version_details?version=2.3.0',
            },
            {
              version: '2.2.1',
              url: '/ocpi/emsp/version_details?version=2.2.1',
            },
          ])
          expect(res.body.status_message).toBe('Success')
        })
    })

    it('should return OCPI-compliant versions for valid CPO role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/cpo/versions')
        .expect(200)
        .expect((res) => {
          expectOcpiResponse(res.body)
          expect(res.body.data).toBeInstanceOf(Array)
          // Note: CPO currently has empty array in version catalog
          expect(res.body.data).toEqual([])
          expect(res.body.status_message).toBe('Success')
        })
    })

    it('should return OCPI-compliant error for invalid role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/invalid-role/versions')
        .expect(400)
        .expect((res: request.Response) => {
          expectOcpiResponse(res.body, 2001) // Invalid parameters
          expect(res.body.status_message).toContain('Invalid')
        })
    })

    it('should return OCPI-compliant error for numeric role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/123/versions')
        .expect(400)
        .expect((res: request.Response) => {
          expectOcpiResponse(res.body, 2001) // Invalid parameters
          expect(res.body.status_message).toContain('Invalid')
        })
    })
  })

  describe('/ocpi/:role/version_details (GET)', () => {
    it('should return OCPI-compliant version details for valid EMSP role and version 2.3.0', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.3.0')
        .expect(200)
        .expect((res) => {
          expectOcpiResponse(res.body)
          expect(res.body.data).toMatchObject({
            version: '2.3.0',
            endpoints: expect.arrayContaining([
              {
                identifier: 'versions',
                url: expect.stringMatching(/\/ocpi\/emsp\/2\.3\.0\/versions$/),
              },
              {
                identifier: 'credentials',
                url: expect.stringMatching(/\/ocpi\/emsp\/2\.3\.0\/credentials$/),
              },
              {
                identifier: 'commands',
                url: expect.stringMatching(/\/ocpi\/emsp\/2\.3\.0\/commands$/),
              },
              {
                identifier: 'sessions',
                url: expect.stringMatching(/\/ocpi\/emsp\/2\.3\.0\/sessions$/),
              },
            ]),
          })
          expect(res.body.status_message).toBe('Success')
        })
    })

    it('should return OCPI-compliant version details for valid EMSP role and version 2.2.1', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.2.1')
        .expect(200)
        .expect((res) => {
          expectOcpiResponse(res.body)
          expect(res.body.data).toMatchObject({
            version: '2.2.1',
            endpoints: expect.arrayContaining([
              {
                identifier: 'versions',
                url: expect.stringMatching(/\/ocpi\/emsp\/2\.2\.1\/versions$/),
              },
            ]),
          })
          expect(res.body.status_message).toBe('Success')
        })
    })

    it('should return OCPI-compliant error for invalid role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/invalid-role/version_details?version=2.3.0')
        .expect(500)
        .expect((res) => {
          expectOcpiResponse(res.body, 3000) // Generic server error
          expect(res.body.status_message).toContain('error')
        })
    })

    it('should return OCPI-compliant error for invalid version', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=invalid-version')
        .expect(400)
        .expect((res) => {
          expectOcpiResponse(res.body, 2003) // Unknown location
          expect(res.body.status_message).toContain('Unknown')
        })
    })

    it('should return OCPI-compliant error for missing version parameter', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details')
        .expect(400)
        .expect((res) => {
          expectOcpiResponse(res.body, 2003) // Unknown location (no version specified)
          expect(res.body.status_message).toContain('Unknown')
        })
    })

    it('should return OCPI-compliant error for valid role but non-existent version combination', () => {
      return request(app.getHttpServer())
        .get('/ocpi/cpo/version_details?version=2.3.0')
        .expect(400)
        .expect((res) => {
          expectOcpiResponse(res.body, 2003) // Unknown location/resource
          expect(res.body.status_message).toContain('Unknown')
        })
    })

    it('should handle empty query parameters gracefully', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=')
        .expect(400)
        .expect((res) => {
          expectOcpiResponse(res.body, 2003) // Unknown location
          expect(res.body.status_message).toContain('Unknown')
        })
    })

    it('should handle extra query parameters', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.3.0&extra=param')
        .expect(200)
        .expect((res) => {
          expectOcpiResponse(res.body)
          expect(res.body.data.version).toBe('2.3.0')
          expect(res.body.status_message).toBe('Success')
        })
    })
  })

  describe('Error handling', () => {
    it('should handle case sensitivity in roles with OCPI error format', () => {
      return request(app.getHttpServer())
        .get('/ocpi/EMSP/versions')
        .expect(400)
        .expect((res) => {
          expectOcpiResponse(res.body, 2001) // Invalid parameters
          expect(res.body.status_message).toContain('Invalid')
        })
    })

    it('should handle case sensitivity in versions with OCPI format', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.3.0')
        .expect(200)
        .expect((res) => {
          expectOcpiResponse(res.body)
          expect(res.body.status_message).toBe('Success')
        })
    })

    it('should handle special characters in role with OCPI error format', () => {
      return request(app.getHttpServer())
        .get('/ocpi/%20emsp%20/versions')
        .expect(400)
        .expect((res) => {
          expectOcpiResponse(res.body, 2001) // Invalid parameters
          expect(res.body.status_message).toContain('Invalid')
        })
    })

    it('should handle URL encoded parameters with OCPI format', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2%2E3%2E0')
        .expect(200)
        .expect((res) => {
          expectOcpiResponse(res.body)
          expect(res.body.status_message).toBe('Success')
        })
    })
  })
})
