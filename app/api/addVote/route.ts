import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';
const prisma = new PrismaClient();

export async function POST(req: any) {
    const data = await req.json();
    console.log(data, 'this is the voter id');

    try {
        const incrementValue = data.vote === 'yes' ? 1 : data.vote === 'no' ? -1 : 0;

        if (incrementValue !== 0) {
            const existingVote = await prisma.vote.findFirst({
                where: {
                    userId: data.email,
                    postId: data.id,
                },
            });

            if (existingVote) {
                return NextResponse.json({ error: 'User has already voted on this post' }, { status: 400 });
            }

            const newVote = await prisma.vote.create({
                data: {
                    vote: data.vote,
                    userId: data.email,
                    postId: data.id,
                },
            });

            const updateLikes = await prisma.post.update({
                where: {
                    id: data.id,
                },
                data: {
                    votes: {
                        increment: incrementValue,
                    },
                },
            });
            return NextResponse.json({ vote: newVote, post: updateLikes });
        } else {
            return NextResponse.json({ error: 'Invalid vote' }, { status: 400 });
        }
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while updating the post' }, { status: 500 });
    }
}