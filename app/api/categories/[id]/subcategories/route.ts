import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Helper function to check if user is admin
async function checkAdminStatus(email: string): Promise<boolean> {
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
    return user?.isAdmin || false
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

// GET /api/categories/[id]/subcategories
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const subcategories = await prisma.subcategory.findMany({
      where: {
        categoryId: params.id
      },
      include: {
        category: {
          include: {
            posts: true
          }
        }
      }
    })

    return NextResponse.json(subcategories)
  } catch (error) {
    console.error('Error fetching subcategories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subcategories' },
      { status: 500 }
    )
  }
}

// POST /api/categories/[id]/subcategories - Create new subcategory (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name } = body

    // Get user email from request headers
    const userEmail = request.headers.get('x-user-email')

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const isAdmin = await checkAdminStatus(userEmail)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Subcategory name is required' },
        { status: 400 }
      )
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: params.id }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if subcategory name already exists in this category
    const existingSubcategory = await prisma.subcategory.findFirst({
      where: {
        name: name.trim(),
        categoryId: params.id
      }
    })

    if (existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory name already exists in this category' },
        { status: 409 }
      )
    }

    const newSubcategory = await prisma.subcategory.create({
      data: {
        name: name.trim(),
        categoryId: params.id
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(newSubcategory)
  } catch (error) {
    console.error('Error creating subcategory:', error)
    return NextResponse.json(
      { error: 'Failed to create subcategory' },
      { status: 500 }
    )
  }
} 