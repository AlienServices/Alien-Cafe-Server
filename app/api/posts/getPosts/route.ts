import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'
import { calculateAverageVoteScore } from '@/app/utils/voteUtils'


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
        
        // Calculate average vote scores for all posts
        const postIds = posts.map(p => p.id);
        const allVotes = await prisma.vote.findMany({
            where: {
                postId: { in: postIds }
            },
            select: {
                postId: true,
                vote: true,
                createdAt: true
            }
        });
        
        // Group votes by postId
        const votesByPostId: Record<string, Array<{ vote: string; createdAt: Date | null }>> = {};
        allVotes.forEach(vote => {
            if (!votesByPostId[vote.postId]) {
                votesByPostId[vote.postId] = [];
            }
            votesByPostId[vote.postId].push({
                vote: vote.vote,
                createdAt: vote.createdAt
            });
        });
        
        // Calculate averages and update posts
        const postsWithAverages = posts.map(post => ({
            ...post,
            votes: votesByPostId[post.id] 
                ? calculateAverageVoteScore(votesByPostId[post.id]) 
                : post.votes
        }));
        
        return NextResponse.json({
            posts: postsWithAverages,
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
