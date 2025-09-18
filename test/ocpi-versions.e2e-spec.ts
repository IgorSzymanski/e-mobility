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

  describe('/ocpi/:role/versions (GET)', () => {
    it('should return versions for valid EMSP role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/versions')
        .expect(200)
        .expect((res: request.Response) => {
          expect(res.body).toEqual([
            {
              version: '2.3.0',
              url: '/ocpi/emsp/version_details?version=2.3.0',
            },
            {
              version: '2.2.1',
              url: '/ocpi/emsp/version_details?version=2.2.1',
            },
          ])
        })
    })

    it('should return versions for valid CPO role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/cpo/versions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array)
          // Note: CPO currently has empty array in version catalog
          expect(res.body).toEqual([])
        })
    })

    it('should return 400 for invalid role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/invalid-role/versions')
        .expect(400)
        .expect((res: request.Response) => {
          expect(res.body).toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
            errors: [
              {
                code: 'invalid_value',
                values: ['cpo', 'emsp'],
                path: ['role'],
                message: 'Invalid option: expected one of "cpo"|"emsp"',
              },
            ],
          })
        })
    })

    it('should return 400 for numeric role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/123/versions')
        .expect(400)
        .expect((res: request.Response) => {
          expect(res.body).toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
          })
        })
    })
  })

  describe('/ocpi/:role/version_details (GET)', () => {
    it('should return version details for valid EMSP role and version 2.3.0', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.3.0')
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            version: '2.3.0',
            endpoints: expect.arrayContaining([
              {
                identifier: 'versions',
                url: 'https://you.example/ocpi/emsp/2.3.0/versions',
              },
              {
                identifier: 'credentials',
                url: 'https://you.example/ocpi/emsp/2.3.0/credentials',
              },
              {
                identifier: 'commands',
                url: 'https://you.example/ocpi/emsp/2.3.0/commands',
              },
              {
                identifier: 'sessions',
                url: 'https://you.example/ocpi/emsp/2.3.0/sessions',
              },
            ]),
          })
        })
    })

    it('should return version details for valid EMSP role and version 2.2.1', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.2.1')
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            version: '2.2.1',
            endpoints: expect.arrayContaining([
              {
                identifier: 'versions',
                url: 'https://you.example/ocpi/emsp/2.2.1/versions',
              },
            ]),
          })
        })
    })

    it('should return 400 for invalid role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/invalid-role/version_details?version=2.3.0')
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
            errors: [
              {
                code: 'invalid_value',
                values: ['cpo', 'emsp'],
                path: ['role'],
                message: 'Invalid option: expected one of "cpo"|"emsp"',
              },
            ],
          })
        })
    })

    it('should return 400 for invalid version', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=invalid-version')
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
            errors: [
              {
                code: 'invalid_value',
                values: ['2.2.1', '2.3.0'],
                path: ['version'],
                message: 'Invalid option: expected one of "2.2.1"|"2.3.0"',
              },
            ],
          })
        })
    })

    it('should return 400 for missing version parameter', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details')
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
          })
        })
    })

    it('should return 404 for valid role but non-existent version combination', () => {
      return request(app.getHttpServer())
        .get('/ocpi/cpo/version_details?version=2.3.0')
        .expect(404)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 404,
            message: 'Version 2.3.0 not found for role cpo',
          })
        })
    })

    it('should handle empty query parameters gracefully', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=')
        .expect(400)
        .expect((res) => {
          expect(res.body).toMatchObject({
            statusCode: 400,
            message: 'Validation failed',
          })
        })
    })

    it('should handle extra query parameters', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.3.0&extra=param')
        .expect(200)
        .expect((res) => {
          expect((res.body as { version: string }).version).toBe('2.3.0')
        })
    })
  })

  describe('Error handling', () => {
    it('should handle case sensitivity in roles', () => {
      return request(app.getHttpServer()).get('/ocpi/EMSP/versions').expect(400)
    })

    it('should handle case sensitivity in versions', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2.3.0')
        .expect(200)
    })

    it('should handle special characters in role', () => {
      return request(app.getHttpServer())
        .get('/ocpi/%20emsp%20/versions')
        .expect(400)
    })

    it('should handle URL encoded parameters', () => {
      return request(app.getHttpServer())
        .get('/ocpi/emsp/version_details?version=2%2E3%2E0')
        .expect(200)
    })
  })
})
