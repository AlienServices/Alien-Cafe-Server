import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';
import { calculateAverageVoteScore } from '@/app/utils/voteUtils';

export async function POST(req: any) {
    const data = await req.json();
    try {
        if (['true', 'probably true', 'neutral', 'probably false', 'voted false'].includes(data.vote)) {
            const existingVote = await prisma.vote.findFirst({
                where: {
                    userId: data.userId,
                    postId: data.id
                },
            });

            if (existingVote) {
                return NextResponse.json({ 
                    error: 'User has already voted on this post',
                    details: {
                        existingVote: existingVote.vote,
                        voteId: existingVote.id
                    }
                }, { status: 400 });
            }
            
            // Create the new vote (createdAt will be set automatically)
            const newVote = await prisma.vote.create({
                data: {
                    vote: data.vote,
                    userId: data.userId,
                    postId: data.id,
                },
            });
            
            // Fetch all votes for this post to calculate the new average
            const allVotes = await prisma.vote.findMany({
                where: {
                    postId: data.id,
                },
            });
            
            // Calculate the average vote score (includes old and new votes)
            const averageScore = calculateAverageVoteScore(allVotes);
            
            // Update the post with the calculated average
            await prisma.post.update({
                where: {
                    id: data.id,
                },
                data: {
                    votes: averageScore,
                },
            });
            
            return NextResponse.json({ vote: newVote });
        } else {
            return NextResponse.json({ 
                error: 'Invalid vote',
                details: {
                    received: data.vote,
                    validValues: ['true', 'probably true', 'neutral', 'probably false', 'voted false']
                }
            }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ 
            error: 'An error occurred while updating the post',
            details: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
