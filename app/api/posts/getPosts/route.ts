import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


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
                    },
                    media: {
                        select: {
                            id: true,
                            filename: true,
                            originalName: true,
                            mimeType: true,
                            storagePath: true,
                            thumbnailPath: true,
                            altText: true,
                            caption: true,
                            isVideo: true,
                            order: true
                        },
                        orderBy: {
                            order: 'asc'
                        }
                    },
                    linkPreviews: {
                        select: {
                            id: true,
                            url: true,
                            title: true,
                            description: true,
                            imageUrl: true,
                            domain: true,
                            faviconUrl: true
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
