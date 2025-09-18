import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'

/**
 * OCPI 2.2.1 Compliance Tests
 *
 * These tests ensure that all endpoints comply with OCPI 2.2.1 specification
 * section 4.1.7 Response format requirements:
 *
 * All responses must contain:
 * - data: actual response data (array, object, or string)
 * - status_code: OCPI status code (4-digit number)
 * - status_message: optional status message
 * - timestamp: ISO 8601 timestamp when message was generated
 */
describe('OCPI 2.2.1 Compliance (e2e)', () => {
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

  describe('Versions Endpoints OCPI Compliance', () => {
    describe('GET /ocpi/:role/versions', () => {
      it('should return OCPI-compliant response for EMSP versions', async () => {
        const response = await request(app.getHttpServer())
          .get('/ocpi/emsp/versions')
          .expect(200)

        expectOcpiResponse(response.body)
        expect(response.body.data).toEqual([
          {
            version: '2.3.0',
            url: '/ocpi/emsp/version_details?version=2.3.0',
          },
          {
            version: '2.2.1',
            url: '/ocpi/emsp/version_details?version=2.2.1',
          },
        ])
        expect(response.body.status_message).toBe('Success')
      })

      it('should return OCPI-compliant response for CPO versions', async () => {
        const response = await request(app.getHttpServer())
          .get('/ocpi/cpo/versions')
          .expect(200)

        expectOcpiResponse(response.body)
        expect(response.body.data).toBeInstanceOf(Array)
        expect(response.body.status_message).toBe('Success')
      })

      it('should return OCPI-compliant error for invalid role', async () => {
        const response = await request(app.getHttpServer())
          .get('/ocpi/invalid-role/versions')
          .expect(400)

        // For validation errors, we should still return OCPI format with appropriate status code
        expectOcpiResponse(response.body, 2001) // Invalid parameters
        expect(response.body.status_message).toContain('Invalid')
      })
    })

    describe('GET /ocpi/:role/version_details', () => {
      it('should return OCPI-compliant version details for EMSP 2.3.0', async () => {
        const response = await request(app.getHttpServer())
          .get('/ocpi/emsp/version_details?version=2.3.0')
          .expect(200)

        expectOcpiResponse(response.body)
        expect(response.body.data).toMatchObject({
          version: '2.3.0',
          endpoints: expect.arrayContaining([
            expect.objectContaining({
              identifier: expect.any(String),
              url: expect.any(String),
            }),
          ]),
        })
        expect(response.body.status_message).toBe('Success')
      })

      it('should return OCPI-compliant error for unknown version', async () => {
        const response = await request(app.getHttpServer())
          .get('/ocpi/cpo/version_details?version=2.3.0')
          .expect(400)

        // CPO role doesn't have 2.3.0 version, so it's treated as invalid parameter
        expectOcpiResponse(response.body, 2003) // Unknown location/resource
      })

      it('should return OCPI-compliant error for missing version parameter', async () => {
        const response = await request(app.getHttpServer())
          .get('/ocpi/emsp/version_details')
          .expect(400)

        expectOcpiResponse(response.body, 2003) // Unknown location (no version specified)
      })
    })
  })

  describe('Credentials Endpoints OCPI Compliance', () => {
    describe('GET /ocpi/:role/2.2.1/credentials', () => {
      it('should return OCPI-compliant credentials response', async () => {
        const response = await request(app.getHttpServer())
          .get('/ocpi/emsp/2.2.1/credentials')
          .expect(200)

        expectOcpiResponse(response.body)
        expect(response.body.data).toMatchObject({
          token: expect.any(String),
          url: expect.any(String),
          roles: expect.arrayContaining([
            expect.objectContaining({
              role: expect.any(String),
              business_details: expect.objectContaining({
                name: expect.any(String),
              }),
              party_id: expect.any(String),
              country_code: expect.any(String),
            }),
          ]),
        })
        expect(response.body.status_message).toBe('Success')
      })
    })

    describe('POST /ocpi/:role/2.2.1/credentials', () => {
      it('should return OCPI-compliant response for valid credentials registration', async () => {
        const credentialsPayload = {
          token: 'test-token-b',
          url: 'https://example.com/ocpi/emsp/versions',
          roles: [
            {
              role: 'EMSP',
              business_details: {
                name: 'Test EMSP',
                website: 'https://test-emsp.com',
                logo: {
                  url: 'https://test-emsp.com/logo.png',
                  thumbnail: 'https://test-emsp.com/logo-thumb.png',
                  category: 'OPERATOR',
                  type: 'png',
                  width: 200,
                  height: 200,
                },
              },
              party_id: 'TST',
              country_code: 'NL',
            },
          ],
        }

        const response = await request(app.getHttpServer())
          .post('/ocpi/cpo/2.2.1/credentials')
          .send(credentialsPayload)
          .expect(200)

        expectOcpiResponse(response.body)
        expect(response.body.data).toMatchObject({
          token: expect.any(String),
          url: expect.any(String),
          roles: expect.any(Array),
        })
        expect(response.body.status_message).toBe('Success')
      })

      it('should return OCPI-compliant error for invalid credentials payload', async () => {
        const invalidPayload = {
          // Missing required fields
          token: 'test-token',
        }

        const response = await request(app.getHttpServer())
          .post('/ocpi/cpo/2.2.1/credentials')
          .send(invalidPayload)
          .expect(400)

        expectOcpiResponse(response.body, 2001) // Invalid parameters
        expect(response.body.status_message).toContain('Invalid')
      })
    })

    describe('PUT /ocpi/:role/2.2.1/credentials', () => {
      it('should return OCPI-compliant error for missing peer', async () => {
        const credentialsPayload = {
          token: 'updated-token',
          url: 'https://example.com/ocpi/emsp/versions',
          roles: [
            {
              role: 'EMSP',
              business_details: { name: 'Updated EMSP' },
              party_id: 'UPD',
              country_code: 'NL',
            },
          ],
        }

        const response = await request(app.getHttpServer())
          .put('/ocpi/cpo/2.2.1/credentials')
          .send(credentialsPayload)
          .expect(400)

        expectOcpiResponse(response.body, 2001) // Invalid parameters
        expect(response.body.status_message).toContain('not found')
      })
    })

    describe('DELETE /ocpi/:role/2.2.1/credentials', () => {
      it('should return OCPI-compliant response for credentials deletion', async () => {
        const response = await request(app.getHttpServer())
          .delete('/ocpi/cpo/2.2.1/credentials')
          .expect(200)

        expectOcpiResponse(response.body)
        // For DELETE, data field may be omitted or undefined according to OCPI spec
        expect(response.body.status_message).toBe('Success')
      })
    })
  })

  describe('Error Handling OCPI Compliance', () => {
    it('should return OCPI-compliant 404 for non-existent endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/ocpi/emsp/2.2.1/non-existent')
        .expect(404)

      // Even 404s should follow OCPI format when on OCPI paths
      expect(response.body).toMatchObject({
        status_code: expect.any(Number),
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/,
        ),
      })
    })

    it('should handle malformed JSON with OCPI error format', async () => {
      const response = await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400)

      // Should return OCPI-compliant error for malformed JSON
      expectOcpiResponse(response.body, 2001) // Invalid parameters
    })
  })

  describe('Content-Type and Headers Compliance', () => {
    it('should return application/json content-type for all OCPI responses', async () => {
      await request(app.getHttpServer())
        .get('/ocpi/emsp/versions')
        .expect('Content-Type', /application\/json/)
        .expect(200)
    })

    it('should handle missing Content-Type header gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/ocpi/emsp/versions')
        .expect(200)

      expectOcpiResponse(response.body)
    })
  })
})
