import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma Client with optimized settings for serverless
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Wrapper to execute Prisma queries with automatic retry on connection errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: any
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a connection error (P1017, P1001, P1008, P1011)
      const isConnectionError = 
        error?.code === 'P1017' || // Server closed connection
        error?.code === 'P1001' || // Can't reach database
        error?.code === 'P1008' || // Operations timed out
        error?.code === 'P1011'    // Error opening TLS connection
      
      if (isConnectionError && attempt < maxRetries) {
        console.warn(`Database connection error (${error?.code}), attempt ${attempt}/${maxRetries}`)
        
        // Disconnect and reconnect
        try {
          await prisma.$disconnect()
        } catch (e) {
          // Ignore disconnect errors
        }
        
        // Wait before retrying with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Reconnect
        try {
          await prisma.$connect()
        } catch (e) {
          console.error('Reconnection failed:', e)
        }
      } else {
        // Not a connection error or max retries reached
        throw error
      }
    }
  }
  
  throw lastError
}

