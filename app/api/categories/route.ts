import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to check if user is admin
async function checkAdminStatus(email: string): Promise<boolean> {
  console.log(`[DEBUG] checkAdminStatus called with email: ${email}`)
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        }
      },
      select: {
        isAdmin: true
      }
    })
    const isAdmin = user?.isAdmin || false
    console.log(`[DEBUG] Admin check result for ${email}: ${isAdmin}`)
    return isAdmin
  } catch (error) {
    console.error('[DEBUG] Error checking admin status:', error)
    return false
  }
}

// GET /api/categories
export async function GET() {
  console.log('[DEBUG] GET /api/categories - Request received')
  try {
    console.log('[DEBUG] Fetching categories from database...')
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true,
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    console.log(`[DEBUG] Successfully fetched ${categories.length} categories`)
    // Ensure subcategories are ordered case-insensitively by name
    const sortedCategories = categories.map((category) => ({
      ...category,
      subcategories: (category.subcategories || []).slice().sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      )
    }))
    return NextResponse.json(sortedCategories)
  } catch (error) {
    console.error('[DEBUG] Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create new category (admin only)
export async function POST(req: NextRequest) {
  console.log('[DEBUG] POST /api/categories - Request received')
  try {
    const body = await req.json()
    console.log('[DEBUG] Request body:', JSON.stringify(body, null, 2))
    
    const { name, iconPath, isCustomIcon } = body
    console.log(`[DEBUG] Extracted data - name: "${name}", iconPath: "${iconPath}", isCustomIcon: ${isCustomIcon}`)

    // Get user email from request headers or body
    const userEmail = req.headers.get('x-user-email') || body.userEmail
    console.log(`[DEBUG] User email: ${userEmail}`)

    if (!userEmail) {
      console.log('[DEBUG] No user email provided - returning 401')
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    console.log('[DEBUG] Checking admin status...')
    const isAdmin = await checkAdminStatus(userEmail)
    console.log(`[DEBUG] Admin check result: ${isAdmin}`)
    
    if (!isAdmin) {
      console.log('[DEBUG] User is not admin - returning 403')
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    if (!name || !name.trim()) {
      console.log('[DEBUG] No category name provided - returning 400')
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    console.log('[DEBUG] Creating category in database...')
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        iconPath: iconPath || null,
        isCustomIcon: isCustomIcon || false,
      },
      include: {
        subcategories: true,
      }
    })

    console.log(`[DEBUG] Category created successfully with ID: ${category.id}`)
    return NextResponse.json(category)
  } catch (error) {
    console.error('[DEBUG] Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
} 