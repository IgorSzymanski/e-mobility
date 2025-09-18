import { Test, TestingModule } from '@nestjs/testing'
import { PrismaClient } from '@prisma/client'
import { PeersRepository } from './peers.repository'
import { OcpiConfigService } from '@/shared/config/ocpi.config'
import { TokenGenerator } from '@/infrastructure/security/token-generator'
import type { CredentialsDto } from '@/ocpi/v2_2_1/credentials/dto/credentials.dto'

describe('PeersRepository Integration Tests', () => {
  let repository: PeersRepository
  let prisma: PrismaClient
  let moduleRef: TestingModule

  const mockCredentialsDto: CredentialsDto = {
    token: 'test-token-b',
    url: 'https://example.com/ocpi/versions',
    roles: [
      {
        country_code: 'NL',
        party_id: 'TST',
        role: 'EMSP',
        business_details: {
          name: 'Test EMSP',
          website: 'https://test-emsp.com',
        },
      },
    ],
  }

  beforeAll(async () => {
    // Use the same database connection as the main application
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })

    const mockOcpiConfig = {
      getEndpointUrl: vi
        .fn()
        .mockImplementation(
          (role, version, identifier) =>
            `http://localhost:3000/ocpi/${role}/${version}/${identifier}`,
        ),
      baseUrl: 'http://localhost:3000',
      partyId: 'TEST',
      countryCode: 'NL',
      businessName: 'Test Business',
      businessWebsite: 'https://test-business.com',
    }

    const mockTokenGenerator = {
      generate: vi.fn().mockReturnValue('generated-test-token'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeersRepository,
        {
          provide: PrismaClient,
          useValue: prisma,
        },
        {
          provide: OcpiConfigService,
          useValue: mockOcpiConfig,
        },
        {
          provide: TokenGenerator,
          useValue: mockTokenGenerator,
        },
      ],
    }).compile()

    repository = module.get<PeersRepository>(PeersRepository)
    moduleRef = module

    // Connect to database
    await prisma.$connect()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.$executeRaw`DELETE FROM ocpi.peer_endpoints WHERE peer_id IN (
      SELECT id FROM ocpi.peers WHERE country_code = 'NL' AND party_id = 'TST'
    )`
    await prisma.$executeRaw`DELETE FROM ocpi.peers WHERE country_code = 'NL' AND party_id = 'TST'`
  })

  afterAll(async () => {
    // Final cleanup
    await prisma.$executeRaw`DELETE FROM ocpi.peer_endpoints WHERE peer_id IN (
      SELECT id FROM ocpi.peers WHERE country_code = 'NL' AND party_id = 'TST'
    )`
    await prisma.$executeRaw`DELETE FROM ocpi.peers WHERE country_code = 'NL' AND party_id = 'TST'`

    await prisma.$disconnect()
    await moduleRef.close()
  })

  describe('upsertFromIncomingCredentials', () => {
    it('should create a new peer when it does not exist', async () => {
      const result =
        await repository.upsertFromIncomingCredentials(mockCredentialsDto)

      expect(result).toBeDefined()
      expect(result.countryCode).toBe('NL')
      expect(result.partyId).toBe('TST')
      expect(result.baseVersionsUrl).toBe('https://example.com/ocpi/versions')
      expect(result.ourTokenForPeer).toBe('test-token-b')
      expect(result.status).toBe('PENDING')
      expect(result.chosenVersion).toBe('v2_2_1')

      // Verify rolesJson is properly stored
      expect(result.rolesJson).toEqual(mockCredentialsDto.roles)
    })

    it('should update an existing peer when it already exists', async () => {
      // First, create a peer
      const firstResult =
        await repository.upsertFromIncomingCredentials(mockCredentialsDto)
      const originalId = firstResult.id

      // Update with new data
      const updatedDto: CredentialsDto = {
        ...mockCredentialsDto,
        token: 'updated-token-b',
        url: 'https://updated.example.com/ocpi/versions',
      }

      const result = await repository.upsertFromIncomingCredentials(updatedDto)

      expect(result.id).toBe(originalId) // Same peer
      expect(result.ourTokenForPeer).toBe('updated-token-b')
      expect(result.baseVersionsUrl).toBe(
        'https://updated.example.com/ocpi/versions',
      )
      expect(result.status).toBe('PENDING') // Should be reset to PENDING
    })

    it('should handle multiple roles in credentials', async () => {
      const multiRoleDto: CredentialsDto = {
        token: 'multi-role-token',
        url: 'https://example.com/ocpi/versions',
        roles: [
          {
            country_code: 'NL',
            party_id: 'TST',
            role: 'EMSP',
            business_details: { name: 'Test EMSP' },
          },
          {
            country_code: 'NL',
            party_id: 'TST',
            role: 'CPO',
            business_details: { name: 'Test CPO' },
          },
        ],
      }

      const result =
        await repository.upsertFromIncomingCredentials(multiRoleDto)

      expect(result).toBeDefined()
      expect(result.rolesJson).toHaveLength(2)
      expect((result.rolesJson as any)[0].role).toBe('EMSP')
      expect((result.rolesJson as any)[1].role).toBe('CPO')
    })
  })

  describe('setPeerTokenForUs', () => {
    let testPeerId: string

    beforeEach(async () => {
      // Create a test peer first
      const peer =
        await repository.upsertFromIncomingCredentials(mockCredentialsDto)
      testPeerId = peer.id
    })

    it('should update peer token and add endpoints', async () => {
      const endpoints = [
        {
          identifier: 'credentials',
          role: 'EMSP',
          url: 'https://example.com/credentials',
        },
        {
          identifier: 'sessions',
          role: 'EMSP',
          url: 'https://example.com/sessions',
        },
        {
          identifier: 'locations',
          role: 'CPO',
          url: 'https://example.com/locations',
        },
      ]

      await repository.setPeerTokenForUs(
        testPeerId,
        'token-c',
        'v2_3_0',
        endpoints,
      )

      // Verify peer was updated
      const updatedPeer = await prisma.ocpiPeer.findUnique({
        where: { id: testPeerId },
        include: { endpoints: true },
      })

      expect(updatedPeer).toBeDefined()
      expect(updatedPeer!.peerTokenForUs).toBe('token-c')
      expect(updatedPeer!.chosenVersion).toBe('v2_3_0')
      expect(updatedPeer!.status).toBe('REGISTERED')

      // Verify endpoints were created
      expect(updatedPeer!.endpoints).toHaveLength(3)

      const credentialsEndpoint = updatedPeer!.endpoints.find(
        (e) => e.module === 'credentials',
      )
      expect(credentialsEndpoint).toBeDefined()
      expect(credentialsEndpoint!.role).toBe('emsp')
      expect(credentialsEndpoint!.url).toBe('https://example.com/credentials')
    })

    it('should replace existing endpoints when called multiple times', async () => {
      // First set of endpoints
      const initialEndpoints = [
        {
          identifier: 'credentials',
          role: 'EMSP',
          url: 'https://example.com/credentials',
        },
      ]

      await repository.setPeerTokenForUs(
        testPeerId,
        'token-c-1',
        'v2_2_1',
        initialEndpoints,
      )

      // Second set of endpoints (should replace the first)
      const newEndpoints = [
        {
          identifier: 'sessions',
          role: 'EMSP',
          url: 'https://example.com/sessions',
        },
        {
          identifier: 'locations',
          role: 'CPO',
          url: 'https://example.com/locations',
        },
      ]

      await repository.setPeerTokenForUs(
        testPeerId,
        'token-c-2',
        'v2_3_0',
        newEndpoints,
      )

      // Verify only the new endpoints exist
      const updatedPeer = await prisma.ocpiPeer.findUnique({
        where: { id: testPeerId },
        include: { endpoints: true },
      })

      expect(updatedPeer!.endpoints).toHaveLength(2)
      expect(
        updatedPeer!.endpoints.some((e) => e.module === 'credentials'),
      ).toBe(false)
      expect(updatedPeer!.endpoints.some((e) => e.module === 'sessions')).toBe(
        true,
      )
      expect(updatedPeer!.endpoints.some((e) => e.module === 'locations')).toBe(
        true,
      )
    })
  })

  describe('updateFromIncomingCredentials', () => {
    beforeEach(async () => {
      // Create a test peer first
      await repository.upsertFromIncomingCredentials(mockCredentialsDto)
    })

    it('should update existing peer credentials', async () => {
      const updatedDto: CredentialsDto = {
        token: 'new-token-b',
        url: 'https://new.example.com/ocpi/versions',
        roles: [
          {
            country_code: 'NL',
            party_id: 'TST',
            role: 'CPO',
            business_details: { name: 'Updated Test CPO' },
          },
        ],
      }

      const result = await repository.updateFromIncomingCredentials(updatedDto)

      expect(result).toBeDefined()
      expect(result!.ourTokenForPeer).toBe('new-token-b')
      expect(result!.baseVersionsUrl).toBe(
        'https://new.example.com/ocpi/versions',
      )
      expect(result!.status).toBe('PENDING')

      const rolesJson = result!.rolesJson as any
      expect(rolesJson[0].role).toBe('CPO')
      expect(rolesJson[0].business_details.name).toBe('Updated Test CPO')
    })

    it('should return null when peer does not exist', async () => {
      const nonExistentDto: CredentialsDto = {
        token: 'token',
        url: 'https://example.com/ocpi/versions',
        roles: [
          {
            country_code: 'XX',
            party_id: 'NON',
            role: 'EMSP',
            business_details: { name: 'Non-existent' },
          },
        ],
      }

      const result =
        await repository.updateFromIncomingCredentials(nonExistentDto)
      expect(result).toBeUndefined()
    })
  })

  describe('getSelfPresentation', () => {
    it('should return self presentation with correct structure', async () => {
      const result = await repository.getSelfPresentation()

      expect(result).toBeDefined()
      expect(result.token).toBeDefined()
      expect(result.url).toBeDefined()
      expect(result.roles).toBeDefined()
      expect(Array.isArray(result.roles)).toBe(true)
      expect(result.roles.length).toBeGreaterThan(0)

      const firstRole = result.roles[0]
      expect(firstRole.role).toBeDefined()
      expect(firstRole.country_code).toBeDefined()
      expect(firstRole.party_id).toBeDefined()
      expect(firstRole.business_details).toBeDefined()
    })

    it('should return frozen object', async () => {
      const result = await repository.getSelfPresentation()

      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  describe('database schema validation', () => {
    it('should work with the ocpi schema and table structure', async () => {
      // This test verifies that our queries work with the actual database schema
      const peer =
        await repository.upsertFromIncomingCredentials(mockCredentialsDto)

      // Directly query the database to verify the data is in the correct schema/table
      const directResult = await prisma.$queryRaw`
        SELECT * FROM ocpi.peers WHERE id = ${peer.id}
      `

      expect(directResult).toHaveLength(1)
    })

    it('should handle enum values correctly', async () => {
      const peer =
        await repository.upsertFromIncomingCredentials(mockCredentialsDto)

      // Test setting peer token which changes status to REGISTERED
      await repository.setPeerTokenForUs(peer.id, 'test-token-c', 'v2_3_0', [])

      // Verify enum values are stored correctly
      const updatedPeer = await prisma.ocpiPeer.findUnique({
        where: { id: peer.id },
      })

      expect(updatedPeer!.status).toBe('REGISTERED')
      expect(updatedPeer!.chosenVersion).toBe('v2_3_0')
    })
  })
})
