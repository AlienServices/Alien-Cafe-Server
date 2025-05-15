import { PrismaClient, Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const categories = searchParams.get('categories')?.split(',')
  const subcategories = searchParams.get('subcategories')?.split(',')
  const tags = searchParams.get('tags')?.split(',')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const sortBy = searchParams.get('sortBy') || 'relevance'

  try {
    // Build the search query
    const where: Prisma.PostWhereInput = {
      AND: [
        // Only add search vector condition if query exists
        ...(query ? [{
          OR: [
            {
              searchVector: {
                contains: query,
                mode: 'insensitive' as Prisma.QueryMode
              }
            }
          ]
        }] : []),
        ...(categories?.length ? [{
          categories: {
            some: {
              name: {
                in: categories
              }
            }
          }
        }] : []),
        ...(subcategories?.length ? [{
          subCategories: {
            hasSome: subcategories
          }
        }] : []),
        ...(tags?.length ? [{
          tags: {
            hasSome: tags
          }
        }] : [])
      ]
    }

    // If no filters are applied at all, return an error
    if (!query && !categories?.length && !subcategories?.length && !tags?.length) {
      return NextResponse.json({ 
        error: 'At least one search parameter (query, categories, subcategories, or tags) is required' 
      }, { status: 400 })
    }

    const searchQuery = {
      where,
      include: {
        categories: true,
        owner: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'desc' as Prisma.SortOrder
      },
      skip: (page - 1) * limit,
      take: limit
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany(searchQuery),
      prisma.post.count({
        where: searchQuery.where
      })
    ])

    return NextResponse.json({
      posts,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        limit
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
} 