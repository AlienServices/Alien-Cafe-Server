import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  console.log("Fetching categories")
  console.log("Request URL:", req.url)
  console.log("Request method:", req.method)
  
  try {
    // Test database connection first
    await prisma.$connect()
    console.log("Database connection successful")
    
    // Start with a simple query
    const categories = await prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    })
    
    console.log(`Found ${categories.length} categories`)
    
    // If simple query works, try the full query
    const fullCategories = await prisma.category.findMany({
      include: {
        subcategories: true,
        _count: {
          select: {
            posts: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    console.log(`Full query found ${fullCategories.length} categories`)
    
    // Create response with proper headers
    const response = NextResponse.json(fullCategories)
    
    // Add cache control headers to prevent caching issues
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Content-Type', 'application/json')
    
    return response
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
