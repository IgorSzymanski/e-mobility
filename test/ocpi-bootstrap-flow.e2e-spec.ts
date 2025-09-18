import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import nock from 'nock'
import { AppModule } from '../src/app.module'
import { PrismaClient } from '@prisma/client'

describe('OCPI Bootstrap Flow (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaClient

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = app.get(PrismaClient)
    await app.init()
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await app.close()
    nock.cleanAll()
  })

  beforeEach(async () => {
    // Clean up database state before each test
    await prisma.ocpiPeerEndpoint.deleteMany()
    await prisma.ocpiPeer.deleteMany()
    await prisma.ocpiBootstrapToken.deleteMany()
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('Complete Bootstrap Flow', () => {
    it('should complete the full OCPI bootstrap registration flow', async () => {
      // Step 1: Create a bootstrap token
      const createTokenResponse = await request(app.getHttpServer())
        .post('/admin/ocpi/bootstrap-tokens')
        .send({
          description: 'Test bootstrap token',
          expiresInDays: 7,
        })
        .expect(201)

      const bootstrapToken = createTokenResponse.body.data.token
      expect(bootstrapToken).toBeDefined()

      // Mock external peer's endpoints
      const peerBaseUrl = 'https://peer.example.com'
      const peerVersionsUrl = `${peerBaseUrl}/ocpi/versions`
      const peerVersion221Url = `${peerBaseUrl}/ocpi/2.2.1`

      // Mock peer's /versions endpoint
      nock(peerBaseUrl)
        .get('/ocpi/versions')
        .reply(200, {
          status_code: 1000,
          data: [
            {
              version: '2.2.1',
              url: peerVersion221Url,
            },
          ],
          timestamp: new Date().toISOString(),
        })

      // Mock peer's /2.2.1 endpoint (version details)
      nock(peerBaseUrl)
        .get('/ocpi/2.2.1')
        .reply(200, {
          status_code: 1000,
          data: {
            version: '2.2.1',
            endpoints: [
              {
                identifier: 'credentials',
                role: 'EMSP',
                url: `${peerBaseUrl}/ocpi/emsp/2.2.1/credentials`,
              },
              {
                identifier: 'locations',
                role: 'EMSP',
                url: `${peerBaseUrl}/ocpi/emsp/2.2.1/locations`,
              },
            ],
          },
          timestamp: new Date().toISOString(),
        })

      // Step 2: Peer initiates registration using bootstrap token
      const peerCredentials = {
        token: 'peer_token_B_for_us',
        url: peerVersionsUrl,
        roles: [
          {
            role: 'EMSP',
            party_id: 'ABC',
            country_code: 'DE',
            business_details: {
              name: 'Test EMSP',
              website: 'https://test-emsp.com',
            },
          },
        ],
      }

      const registrationResponse = await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${bootstrapToken}`)
        .send(peerCredentials)
        .expect(200)

      expect(registrationResponse.body.status_code).toBe(1000)
      expect(registrationResponse.body.data).toHaveProperty('token')
      expect(registrationResponse.body.data).toHaveProperty('url')
      expect(registrationResponse.body.data).toHaveProperty('roles')

      const ourTokenForPeer = registrationResponse.body.data.token
      expect(ourTokenForPeer).toBeDefined()
      expect(ourTokenForPeer).not.toBe(bootstrapToken)

      // Verify peer was stored correctly in database
      const storedPeer = await prisma.ocpiPeer.findFirst({
        where: {
          countryCode: 'DE',
          partyId: 'ABC',
        },
        include: {
          endpoints: true,
        },
      })

      expect(storedPeer).toBeDefined()
      expect(storedPeer?.ourTokenForPeer).toBe('peer_token_B_for_us')
      expect(storedPeer?.peerTokenForUs).toBe(ourTokenForPeer)
      expect(storedPeer?.status).toBe('REGISTERED')
      expect(storedPeer?.chosenVersion).toBe('2.2.1')
      expect(storedPeer?.endpoints).toHaveLength(2)

      // Verify bootstrap token was marked as used
      const usedToken = await prisma.ocpiBootstrapToken.findFirst({
        where: { token: bootstrapToken },
      })
      expect(usedToken?.usedAt).toBeDefined()
      expect(usedToken?.usedBy).toBe('DE-ABC')
      expect(usedToken?.isActive).toBe(false)

      // Step 3: Test that the peer can now authenticate with their token
      const authenticatedResponse = await request(app.getHttpServer())
        .get('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${ourTokenForPeer}`)
        .expect(200)

      expect(authenticatedResponse.body.status_code).toBe(1000)
      expect(authenticatedResponse.body.data).toHaveProperty('token')

      // Step 4: Test that bootstrap token cannot be used again
      await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${bootstrapToken}`)
        .send(peerCredentials)
        .expect(401) // Should fail with unauthorized
    })

    it('should handle token rotation via PUT', async () => {
      // First, establish a peer through the bootstrap flow
      const createTokenResponse = await request(app.getHttpServer())
        .post('/admin/ocpi/bootstrap-tokens')
        .send({ description: 'Test token for rotation' })
        .expect(201)

      const bootstrapToken = createTokenResponse.body.data.token

      // Mock external endpoints for initial registration
      const peerBaseUrl = 'https://rotation-peer.example.com'
      nock(peerBaseUrl)
        .get('/ocpi/versions')
        .reply(200, {
          status_code: 1000,
          data: [{ version: '2.2.1', url: `${peerBaseUrl}/ocpi/2.2.1` }],
          timestamp: new Date().toISOString(),
        })

      nock(peerBaseUrl)
        .get('/ocpi/2.2.1')
        .reply(200, {
          status_code: 1000,
          data: {
            version: '2.2.1',
            endpoints: [
              {
                identifier: 'credentials',
                role: 'EMSP',
                url: `${peerBaseUrl}/ocpi/emsp/2.2.1/credentials`,
              },
            ],
          },
          timestamp: new Date().toISOString(),
        })

      // Initial registration
      const initialCredentials = {
        token: 'initial_peer_token_B',
        url: `${peerBaseUrl}/ocpi/versions`,
        roles: [
          {
            role: 'EMSP',
            party_id: 'ROT',
            country_code: 'NL',
            business_details: { name: 'Rotation Test EMSP' },
          },
        ],
      }

      const initialResponse = await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${bootstrapToken}`)
        .send(initialCredentials)
        .expect(200)

      const firstToken = initialResponse.body.data.token

      // Mock updated endpoints for token rotation
      nock(peerBaseUrl)
        .get('/ocpi/versions')
        .reply(200, {
          status_code: 1000,
          data: [{ version: '2.2.1', url: `${peerBaseUrl}/ocpi/2.2.1` }],
          timestamp: new Date().toISOString(),
        })

      nock(peerBaseUrl)
        .get('/ocpi/2.2.1')
        .reply(200, {
          status_code: 1000,
          data: {
            version: '2.2.1',
            endpoints: [
              {
                identifier: 'credentials',
                role: 'EMSP',
                url: `${peerBaseUrl}/ocpi/emsp/2.2.1/credentials`,
              },
            ],
          },
          timestamp: new Date().toISOString(),
        })

      // Rotate token via PUT
      const rotatedCredentials = {
        token: 'rotated_peer_token_B',
        url: `${peerBaseUrl}/ocpi/versions`,
        roles: initialCredentials.roles,
      }

      const rotationResponse = await request(app.getHttpServer())
        .put('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${firstToken}`)
        .send(rotatedCredentials)
        .expect(200)

      const newToken = rotationResponse.body.data.token
      expect(newToken).toBeDefined()
      expect(newToken).not.toBe(firstToken)

      // Verify old token no longer works
      await request(app.getHttpServer())
        .get('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${firstToken}`)
        .expect(401)

      // Verify new token works
      await request(app.getHttpServer())
        .get('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${newToken}`)
        .expect(200)

      // Verify database state
      const peer = await prisma.ocpiPeer.findFirst({
        where: { countryCode: 'NL', partyId: 'ROT' },
      })
      expect(peer?.ourTokenForPeer).toBe('rotated_peer_token_B')
      expect(peer?.peerTokenForUs).toBe(newToken)
    })

    it('should handle peer unregistration via DELETE', async () => {
      // Establish a peer first
      const createTokenResponse = await request(app.getHttpServer())
        .post('/admin/ocpi/bootstrap-tokens')
        .send({ description: 'Test token for deletion' })
        .expect(201)

      const bootstrapToken = createTokenResponse.body.data.token

      // Mock external endpoints
      const peerBaseUrl = 'https://delete-peer.example.com'
      nock(peerBaseUrl)
        .get('/ocpi/versions')
        .reply(200, {
          status_code: 1000,
          data: [{ version: '2.2.1', url: `${peerBaseUrl}/ocpi/2.2.1` }],
          timestamp: new Date().toISOString(),
        })

      nock(peerBaseUrl)
        .get('/ocpi/2.2.1')
        .reply(200, {
          status_code: 1000,
          data: {
            version: '2.2.1',
            endpoints: [
              {
                identifier: 'credentials',
                role: 'EMSP',
                url: `${peerBaseUrl}/ocpi/emsp/2.2.1/credentials`,
              },
            ],
          },
          timestamp: new Date().toISOString(),
        })

      // Register peer
      const credentials = {
        token: 'delete_test_token_B',
        url: `${peerBaseUrl}/ocpi/versions`,
        roles: [
          {
            role: 'EMSP',
            party_id: 'DEL',
            country_code: 'FR',
            business_details: { name: 'Delete Test EMSP' },
          },
        ],
      }

      const registerResponse = await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${bootstrapToken}`)
        .send(credentials)
        .expect(200)

      const peerToken = registerResponse.body.data.token

      // Verify peer exists
      let peer = await prisma.ocpiPeer.findFirst({
        where: { countryCode: 'FR', partyId: 'DEL' },
      })
      expect(peer?.status).toBe('REGISTERED')

      // Unregister peer
      await request(app.getHttpServer())
        .delete('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${peerToken}`)
        .expect(200)

      // Verify peer is revoked
      peer = await prisma.ocpiPeer.findFirst({
        where: { countryCode: 'FR', partyId: 'DEL' },
      })
      expect(peer?.status).toBe('REVOKED')

      // Verify token no longer works
      await request(app.getHttpServer())
        .get('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${peerToken}`)
        .expect(401)
    })

    it('should validate that peerTokenForUs is set correctly', async () => {
      // This test specifically checks the issue mentioned by the user
      const createTokenResponse = await request(app.getHttpServer())
        .post('/admin/ocpi/bootstrap-tokens')
        .send({ description: 'Token validation test' })
        .expect(201)

      const bootstrapToken = createTokenResponse.body.data.token

      // Mock external endpoints
      const peerBaseUrl = 'https://validation-peer.example.com'
      nock(peerBaseUrl)
        .get('/ocpi/versions')
        .reply(200, {
          status_code: 1000,
          data: [{ version: '2.2.1', url: `${peerBaseUrl}/ocpi/2.2.1` }],
          timestamp: new Date().toISOString(),
        })

      nock(peerBaseUrl)
        .get('/ocpi/2.2.1')
        .reply(200, {
          status_code: 1000,
          data: {
            version: '2.2.1',
            endpoints: [
              {
                identifier: 'credentials',
                role: 'EMSP',
                url: `${peerBaseUrl}/ocpi/emsp/2.2.1/credentials`,
              },
            ],
          },
          timestamp: new Date().toISOString(),
        })

      const peerCredentials = {
        token: 'peer_provides_this_token_B',
        url: `${peerBaseUrl}/ocpi/versions`,
        roles: [
          {
            role: 'EMSP',
            party_id: 'VAL',
            country_code: 'BE',
            business_details: { name: 'Validation Test EMSP' },
          },
        ],
      }

      const response = await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${bootstrapToken}`)
        .send(peerCredentials)
        .expect(200)

      // Get the token we generated for the peer
      const ourTokenForPeer = response.body.data.token

      // Check database state
      const peer = await prisma.ocpiPeer.findFirst({
        where: { countryCode: 'BE', partyId: 'VAL' },
      })

      // ISSUE VERIFICATION:
      // - ourTokenForPeer should be what the PEER sent us (their token B)
      // - peerTokenForUs should be what WE generated (token C) for them to use
      expect(peer?.ourTokenForPeer).toBe('peer_provides_this_token_B') // What peer sent us
      expect(peer?.peerTokenForUs).toBe(ourTokenForPeer) // What we generated for them

      // The peer should authenticate using the token WE generated (peerTokenForUs)
      // NOT the token they sent us (ourTokenForPeer)
      await request(app.getHttpServer())
        .get('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${ourTokenForPeer}`)
        .expect(200)

      // The peer's token (what they sent us) should NOT work for authentication
      await request(app.getHttpServer())
        .get('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token peer_provides_this_token_B`)
        .expect(401)
    })

    it('should ensure bootstrap tokens become inactive after use', async () => {
      // Create bootstrap token
      const createResponse = await request(app.getHttpServer())
        .post('/admin/ocpi/bootstrap-tokens')
        .send({ description: 'Single use test token' })
        .expect(201)

      const bootstrapToken = createResponse.body.data.token

      // Verify token is initially active
      let tokenData = await prisma.ocpiBootstrapToken.findFirst({
        where: { token: bootstrapToken },
      })
      expect(tokenData?.isActive).toBe(true)
      expect(tokenData?.usedAt).toBeNull()

      // Mock external endpoints
      const peerBaseUrl = 'https://single-use-peer.example.com'
      nock(peerBaseUrl)
        .get('/ocpi/versions')
        .reply(200, {
          status_code: 1000,
          data: [{ version: '2.2.1', url: `${peerBaseUrl}/ocpi/2.2.1` }],
          timestamp: new Date().toISOString(),
        })

      nock(peerBaseUrl)
        .get('/ocpi/2.2.1')
        .reply(200, {
          status_code: 1000,
          data: {
            version: '2.2.1',
            endpoints: [
              {
                identifier: 'credentials',
                role: 'EMSP',
                url: `${peerBaseUrl}/ocpi/emsp/2.2.1/credentials`,
              },
            ],
          },
          timestamp: new Date().toISOString(),
        })

      // Use the bootstrap token
      await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${bootstrapToken}`)
        .send({
          token: 'peer_token_B_single_use',
          url: `${peerBaseUrl}/ocpi/versions`,
          roles: [
            {
              role: 'EMSP',
              party_id: 'SNG',
              country_code: 'GB',
              business_details: { name: 'Single Use Test EMSP' },
            },
          ],
        })
        .expect(200)

      // Verify token is now inactive
      tokenData = await prisma.ocpiBootstrapToken.findFirst({
        where: { token: bootstrapToken },
      })
      expect(tokenData?.isActive).toBe(false)
      expect(tokenData?.usedAt).toBeDefined()
      expect(tokenData?.usedBy).toBe('GB-SNG')

      // Try to use the token again - should fail
      await request(app.getHttpServer())
        .post('/ocpi/cpo/2.2.1/credentials')
        .set('Authorization', `Token ${bootstrapToken}`)
        .send({
          token: 'another_peer_token_B',
          url: `${peerBaseUrl}/ocpi/versions`,
          roles: [
            {
              role: 'EMSP',
              party_id: 'SEC',
              country_code: 'IT',
              business_details: { name: 'Second Use Test EMSP' },
            },
          ],
        })
        .expect(401) // Should be unauthorized
    })
  })
})
