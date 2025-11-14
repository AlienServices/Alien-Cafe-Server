import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';
import { calculateAverageVoteScore } from '@/app/utils/voteUtils';

export async function GET(req: NextRequest) {
    const postId = req.nextUrl.searchParams.get('id');
    const userId = req.nextUrl.searchParams.get('userId'); // Assuming userId is passed as a query parameter

    try {
        const post = await prisma.post.findUnique({
            where: {
                id: postId ? postId : undefined
            },
            include: {
                voteRecords: {
                    where: {
                        userId: userId ? userId : undefined
                    }
                },
                owner: true,
                linkPreviews: true,
                media: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Fetch all votes for this post to calculate average
        const allVotes = await prisma.vote.findMany({
            where: {
                postId: postId ? postId : undefined,
            },
            select: {
                vote: true,
                createdAt: true,
            },
        });

        // Calculate average vote score
        const averageScore = calculateAverageVoteScore(allVotes);

        // Update post.votes with calculated average (for consistency)
        const postWithUpdatedVotes = {
            ...post,
            votes: averageScore,
        };

        const userVote = post.voteRecords.length > 0 ? post.voteRecords[0] : null;

        return NextResponse.json({ post: postWithUpdatedVotes, userVote });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}
