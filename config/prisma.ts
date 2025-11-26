import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Ensure env vars are loaded if this file is imported directly in scripts
if (!process.env.DATABASE_URL) {
  require('dotenv').config()
}

const connectionString = process.env.DATABASE_URL

const pool = new Pool({ 
  connectionString,
  // pg options
  ssl: { rejectUnauthorized: false } // Permissive SSL for Neon/Cloud
})

const adapter = new PrismaPg(pool)

export const prisma = new PrismaClient({ adapter })
