import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    const data = await req.json();
    
    try {
        const newComment = await prisma.comment.create({
            data: {
                comment: data.comment,
                username: data.userName ? data.userName : data.username,
                postId: data.postId,
                userId: data.userId,
                parentId: data.commentId || null,
                vote: data.vote,
            },
        });
        const commentWithReplies = await prisma.comment.findFirst({
            where: {
                id: newComment.id,
            },
            include: {
                replies: {
                    include: {
                        replies: true,
                    },
                },
            },
        });

        return NextResponse.json({ comment: commentWithReplies });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}
