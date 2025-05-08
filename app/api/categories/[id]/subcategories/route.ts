import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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