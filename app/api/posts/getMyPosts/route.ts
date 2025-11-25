import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'
import { calculateAverageVoteScore } from '@/app/utils/voteUtils'


export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '3', 10);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10);
    
    console.log('🔍 [Server] getMyPosts called with:', { email, limit, offset });
    
    if (!email) {
        console.error('❌ [Server] No email provided');
        return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    try {
        const [posts, totalCount] = await Promise.all([
            prisma.post.findMany({
                where: {
                    email
                },
                include: {
                    categories: true,
                    linkPreviews: true,
                    media: {
                        orderBy: {
                            order: 'asc'
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                },
                take: limit,
                skip: offset
            }),
            prisma.post.count({
                where: {
                    email
                }
            })
        ]);
        
        // Calculate average vote scores for all posts
        const postIds = posts.map(p => p.id);
        const allVotes = postIds.length > 0 ? await prisma.vote.findMany({
            where: {
                postId: { in: postIds }
            },
            select: {
                postId: true,
                vote: true,
                createdAt: true
            }
        }) : [];
        
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
        
        // Update posts with calculated averages
        const postsWithAverages = posts.map(post => ({
            ...post,
            votes: votesByPostId[post.id] 
                ? calculateAverageVoteScore(votesByPostId[post.id]) 
                : post.votes
        }));
        
        console.log('🔍 [Server] Found posts:', postsWithAverages.length, 'Total:', totalCount);
        return NextResponse.json({ Posts: postsWithAverages, totalCount });
    } catch (error) {
        console.error('❌ [Server] Database error:', error);
        return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
}   
