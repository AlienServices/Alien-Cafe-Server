import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';
import { calculateAverageVoteScore } from '@/app/utils/voteUtils';

const MAX_LATEST_POSTS = 100;

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    try {
        // Fetch top 100 newest posts from ALL categories (no category filtering)
        // Since we limit to 100 total, we adjust pagination accordingly
        const maxLimit = Math.min(limit, MAX_LATEST_POSTS);
        const skip = Math.min((page - 1) * maxLimit, MAX_LATEST_POSTS);
        
        // Calculate how many posts we can still fetch (remaining from 100)
        const remaining = Math.max(0, MAX_LATEST_POSTS - skip);
        const actualLimit = Math.min(maxLimit, remaining);

        // Get total count (capped at MAX_LATEST_POSTS)
        const totalCount = await prisma.post.count();
        const total = Math.min(totalCount, MAX_LATEST_POSTS);

        // If we've already fetched all 100 posts, return empty array
        if (actualLimit <= 0 || remaining <= 0) {
            return NextResponse.json({
                posts: [],
                page,
                limit: 0,
                total,
                hasMore: false,
            });
        }

        // Fetch posts ordered by date (newest first), limited to actualLimit
        const posts = await prisma.post.findMany({
            include: {
                owner: true,
                comments: true,
                bookmarks: true,
                categories: {
                    include: {
                        subcategories: true
                    }
                },
                subcategories: true,
                linkPreviews: true,
                media: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: { date: 'desc' },
            skip,
            take: actualLimit,
        });

        const limitedPosts = posts;

        // Calculate average vote scores for all posts
        const postIds = limitedPosts.map(p => p.id);
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
        
        // Ensure `subCategories` is always an array and update vote averages
        limitedPosts.forEach((post) => {
            (post as any).subCategories = post.subcategories || [];
            // Update votes with calculated average
            (post as any).votes = votesByPostId[post.id] 
                ? calculateAverageVoteScore(votesByPostId[post.id]) 
                : post.votes;
        });
        
        return NextResponse.json({
            posts: limitedPosts,
            page,
            limit: actualLimit,
            total,
            hasMore: skip + limitedPosts.length < total,
        });
    } catch (error) {
        console.log('Error fetching latest posts:', error);
        return NextResponse.json(
            { error: 'An error occurred while fetching latest posts' },
            { status: 500 }
        );
    }
}

