import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
const prisma = new PrismaClient();

export async function POST(req: any) {
    const data = await req.json();
    console.log(data, 'this is the voter id');

    try {
        // Check if the vote is valid
        if (['true', 'probably true', 'neutral', 'probably false', 'false'].includes(data.vote)) {
            const incrementValue = data.vote === 'true' ? 2 : data.vote === 'probably true' ? 1 : data.vote === 'neutral' ? 0 : data.vote === 'probably false' ? -1 : -2;

            const existingVote = await prisma.vote.findFirst({
                where: {                    
                    postId: data.id,
                },
            });

            if (existingVote) {
                return NextResponse.json({ error: 'User has already voted on this post' }, { status: 400 });
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
            return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
        }
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while updating the post' }, { status: 500 });
    }
}