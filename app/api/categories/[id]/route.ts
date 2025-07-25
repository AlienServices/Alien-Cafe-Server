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

// GET /api/categories/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const category = await prisma.category.findUnique({
      where: {
        id: params.id
      },
      include: {
        subcategories: true,
        posts: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error fetching category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    )
  }
}

// PUT /api/categories/[id] - Update category (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, iconPath, isCustomIcon } = body

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
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing category (excluding current category)
    const nameConflict = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        id: { not: params.id }
      }
    })

    if (nameConflict) {
      return NextResponse.json(
        { error: 'Category name already exists' },
        { status: 409 }
      )
    }

    const updatedCategory = await prisma.category.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        iconPath: iconPath || existingCategory.iconPath,
        isCustomIcon: isCustomIcon !== undefined ? isCustomIcon : existingCategory.isCustomIcon,
      },
      include: {
        subcategories: true,
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

// DELETE /api/categories/[id] - Delete category (admin only)
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

    // Check if category exists
    const existingCategory = await prisma.category.findUnique({
      where: { id: params.id },
      include: {
        subcategories: true,
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // Delete the category (cascades to subcategories due to foreign key constraint)
    await prisma.category.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: 'Category deleted successfully',
      deletedCategory: {
        id: existingCategory.id,
        name: existingCategory.name,
        subcategoriesCount: existingCategory.subcategories.length,
        postsCount: existingCategory._count.posts
      }
    })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
} 