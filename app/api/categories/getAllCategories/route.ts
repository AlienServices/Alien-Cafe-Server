import { NextRequest, NextResponse } from 'next/server'
import { prisma, withRetry } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  console.log("Fetching categories")
  console.log("Request URL:", req.url)
  console.log("Request method:", req.method)
  
  try {
    // Use withRetry wrapper to handle connection errors
    const fullCategories = await withRetry(async () => {
      return await prisma.category.findMany({
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
    })
    
    console.log(`Found ${fullCategories.length} categories`)
    
    // Ensure subcategories are ordered case-insensitively by name
    const sortedCategories = fullCategories.map((category) => ({
      ...category,
      subcategories: (category.subcategories || []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
    }))
    
    // Create response with proper headers
    const response = NextResponse.json(sortedCategories)
    
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
  }
}
