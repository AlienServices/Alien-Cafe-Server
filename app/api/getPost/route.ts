import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

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
                }
            }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const userVote = post.voteRecords.length > 0 ? post.voteRecords[0] : null;

        return NextResponse.json({ post, userVote });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}