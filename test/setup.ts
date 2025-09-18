import { config } from 'dotenv'
import { resolve } from 'path'

// Load test environment variables
const envPath = resolve(__dirname, '../.env.test')
config({ path: envPath })

// Ensure we're in test mode
process.env.NODE_ENV = 'test'

console.log('Test setup loaded with DATABASE_URL:', process.env.DATABASE_URL)
