import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

// Ensure env vars are loaded if this file is imported directly in scripts
if (!process.env.DATABASE_URL) {
  require('dotenv').config()
}

const connectionString = process.env.DATABASE_URL

// Global variable to hold the Prisma instance in development
// to prevent exhausting database connections during hot reloads
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || createPrismaClient()

function createPrismaClient() {
  try {
    const pool = new Pool({ 
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: process.env.NODE_ENV === 'production' ? 1 : 10 // Limit connections in serverless
    })
    
    const adapter = new PrismaPg(pool)
    
    return new PrismaClient({ 
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('Failed to initialize Prisma Client:', error)
    // Fallback to standard client if adapter fails (though less ideal for serverless)
    return new PrismaClient()
  }
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
