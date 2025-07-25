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

// GET /api/subcategories/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const subcategory = await prisma.subcategory.findUnique({
      where: {
        id: params.id
      },
      include: {
        category: {
          include: {
            posts: true
          }
        }
      }
    })

    if (!subcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(subcategory)
  } catch (error) {
    console.error('Error fetching subcategory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subcategory' },
      { status: 500 }
    )
  }
}

// PUT /api/subcategories/[id] - Update subcategory (admin only)
export async function PUT(
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

    // Check if subcategory exists
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: params.id },
      include: {
        category: true
      }
    })

    if (!existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing subcategory in the same category (excluding current subcategory)
    const nameConflict = await prisma.subcategory.findFirst({
      where: {
        name: name.trim(),
        categoryId: existingSubcategory.categoryId,
        id: { not: params.id }
      }
    })

    if (nameConflict) {
      return NextResponse.json(
        { error: 'Subcategory name already exists in this category' },
        { status: 409 }
      )
    }

    const updatedSubcategory = await prisma.subcategory.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
      },
      include: {
        category: true
      }
    })

    return NextResponse.json(updatedSubcategory)
  } catch (error) {
    console.error('Error updating subcategory:', error)
    return NextResponse.json(
      { error: 'Failed to update subcategory' },
      { status: 500 }
    )
  }
}

// DELETE /api/subcategories/[id] - Delete subcategory (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Check if subcategory exists
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: params.id },
      include: {
        category: true,
        posts: true
      }
    })

    if (!existingSubcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      )
    }

    // Delete the subcategory
    await prisma.subcategory.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Subcategory deleted successfully',
      deletedSubcategory: {
        id: existingSubcategory.id,
        name: existingSubcategory.name,
        categoryName: existingSubcategory.category.name,
        postsCount: existingSubcategory.posts.length
      }
    })
  } catch (error) {
    console.error('Error deleting subcategory:', error)
    return NextResponse.json(
      { error: 'Failed to delete subcategory' },
      { status: 500 }
    )
  }
} 