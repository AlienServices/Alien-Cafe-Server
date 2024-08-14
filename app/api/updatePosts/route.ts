import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    const data = await req.json();
    const id = req.nextUrl.searchParams.get('id');
    console.log(data, 'this is the important data');

    try {
        // Delete related votes first (if not using Cascade delete)
        await prisma.vote.deleteMany({
            where: {
                postId: id || '',
            },
        });

        // Now delete the post
        const deletePost = await prisma.post.delete({
            where: {
                id: id || '',
            },
        });

        console.log(deletePost, 'Post deleted successfully');
        return NextResponse.json({ update: deletePost });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }
}