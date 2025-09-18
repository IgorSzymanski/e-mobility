import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding OCPI data...')

  // Create initial bootstrap token for admin access
  const initialBootstrapToken = await prisma.ocpiBootstrapToken.upsert({
    where: { token: 'initial-admin-bootstrap-token' },
    update: {},
    create: {
      token: 'initial-admin-bootstrap-token',
      description: 'Initial admin bootstrap token for first setup',
    },
  })

  console.log('Seeding OCPI version catalog...')

  // Seed EMSP version details
  const emsp230 = await prisma.ocpiVersionDetail.upsert({
    where: { role_version: { role: 'emsp', version: 'v2_3_0' } },
    update: {},
    create: {
      role: 'emsp',
      version: 'v2_3_0',
      endpoints: {
        create: [
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
        ],
      },
    },
  })

  const emsp221 = await prisma.ocpiVersionDetail.upsert({
    where: { role_version: { role: 'emsp', version: 'v2_2_1' } },
    update: {},
    create: {
      role: 'emsp',
      version: 'v2_2_1',
      endpoints: {
        create: [
          {
            identifier: 'versions',
            url: 'https://you.example/ocpi/emsp/2.2.1/versions',
          },
          {
            identifier: 'credentials',
            url: 'https://you.example/ocpi/emsp/2.2.1/credentials',
          },
          {
            identifier: 'commands',
            url: 'https://you.example/ocpi/emsp/2.2.1/commands',
          },
          {
            identifier: 'sessions',
            url: 'https://you.example/ocpi/emsp/2.2.1/sessions',
          },
        ],
      },
    },
  })

  // Seed CPO version details (empty for now, as per original catalog)
  // You can add CPO versions here as needed

  console.log('Seeded version details:', { emsp230, emsp221 })
  console.log('Seeded initial bootstrap token:', initialBootstrapToken)
  console.log('Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
