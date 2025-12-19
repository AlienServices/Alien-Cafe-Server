import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function POST(req: NextRequest) {
    const data = await req.json()    
    const userId = data.userId;

    try {
        const existingPost = await prisma.comment.findUnique({
            where: {
                id: data.commentId ? data.commentId : ''
            },
            select: {
                likes: true,
                dislikes: true, // Ensure both likes and dislikes are selected
                deletedAt: true,
            }
        })

        if (!existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }
        if (existingPost.deletedAt) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        // Remove userId from likes if it exists
        const updatedLikes = existingPost.likes.includes(userId)
            ? existingPost.likes.filter(like => like !== userId)
            : existingPost.likes;

        // Update dislikes array
        const updatedDislikes = existingPost.dislikes.includes(userId)
            ? existingPost.dislikes.filter(dislike => dislike !== userId)
            : [...existingPost.dislikes, userId];

        const updateLikesAndDislikes = await prisma.comment.update({
            where: {
                id: data.commentId ? data.commentId : ''
            },
            data: {
                likes: updatedLikes,       // Update likes array
                dislikes: updatedDislikes, // Update dislikes array
            },
        })

        return NextResponse.json({ update: updateLikesAndDislikes });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while updating likes and dislikes' }, { status: 500 });
    }
}
