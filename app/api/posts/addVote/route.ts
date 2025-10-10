import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: any) {
    const data = await req.json();
    try {
        if (['true', 'probably true', 'neutral', 'probably false', 'voted false'].includes(data.vote)) {
            const incrementValue = data.vote === 'true' ? 2 : data.vote === 'probably true' ? 1 : data.vote === 'neutral' ? 0 : data.vote === 'probably false' ? -1 : -2;

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
            const newVote = await prisma.vote.create({
                data: {
                    vote: data.vote,
                    userId: data.userId,
                    postId: data.id,
                },
            });
            if (incrementValue !== 0) {
                await prisma.post.update({
                    where: {
                        id: data.id,
                    },
                    data: {
                        votes: {
                            increment: incrementValue,
                        },
                    },
                });
            }
            return NextResponse.json({ vote: newVote });
        } else {
            return NextResponse.json({ 
                error: 'Invalid vote',
                details: {
                    received: data.vote,
                    validValues: ['true', 'probably true', 'neutral', 'probably false', 'false']
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
