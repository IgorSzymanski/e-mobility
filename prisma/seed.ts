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

  // Seed CPO version details (empty for now, as per original catalog)
  // You can add CPO versions here as needed

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
