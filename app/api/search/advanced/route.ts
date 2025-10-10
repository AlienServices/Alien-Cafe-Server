import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')
  const categories = searchParams.get('categories')?.split(',')
  const subcategories = searchParams.get('subcategories')?.split(',')
  const tags = searchParams.get('tags')?.split(',')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const sortBy = searchParams.get('sortBy') || 'relevance'

  console.log('Incoming search params:', { query, categories, subcategories, tags, page, limit, sortBy })

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
              id: {
                in: categories
              }
            }
          }
        }] : []),
        ...(subcategories?.length ? [{
          subcategories: {
            some: {
              id: {
                in: subcategories
              }
            }
          }
        }] : []),
        ...(tags?.length ? [{
          tags: {
            hasSome: tags
          }
        }] : [])
      ]
    }

    console.log('Constructed Prisma where filter:', JSON.stringify(where, null, 2))

    // If no filters are applied at all, return an error
    if (!query && !categories?.length && !subcategories?.length && !tags?.length) {
      console.log('No search parameters provided, returning error')
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

    console.log('Final Prisma searchQuery:', JSON.stringify(searchQuery, null, 2))

    const [posts, total] = await Promise.all([
      prisma.post.findMany(searchQuery),
      prisma.post.count({
        where: searchQuery.where
      })
    ])

    console.log('Prisma results:', { postsCount: posts.length, total })

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
