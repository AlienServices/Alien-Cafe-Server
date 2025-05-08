import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { log } from 'console'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    console.log("Fetching categories")
  try {
    const categories = await prisma.category.findMany({
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
      console.log(categories)
      return NextResponse.json(categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
    }
  }
