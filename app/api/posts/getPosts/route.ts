import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    try {
        const [posts, total] = await Promise.all([
            prisma.post.findMany({
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    content: true,
                    date: true,
                    votes: true,
                    email: true,
                    owner: {
                        select: {
                            username: true,
                            email: true
                        }
                    },
                    comments: {
                        select: {
                            id: true,
                            date: true,
                            user: {
                                select: {
                                    username: true
                                }
                            }
                        },
                        take: 5 // Limit comments per post
                    },
                    categories: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            }),
            prisma.post.count()
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
        console.log(error)
        return NextResponse.json({ error: 'An error occurred while fetching posts' }, { status: 500 })
    }
}
