import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

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
                dislikes: true, // Select dislikes to modify them as well
            }
        })

        if (!existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Update likes array
        const updatedLikes = existingPost.likes.includes(userId)
            ? existingPost.likes.filter(like => like !== userId)
            : [...existingPost.likes, userId];
        
        // Update dislikes array by removing the user if present
        const updatedDislikes = existingPost.dislikes.includes(userId)
            ? existingPost.dislikes.filter(dislike => dislike !== userId)
            : existingPost.dislikes;

        const updateLikesAndDislikes = await prisma.comment.update({
            where: {
                id: data.commentId ? data.commentId : ''
            },
            data: {
                likes: updatedLikes,
                dislikes: updatedDislikes, // Include the updated dislikes array
            },
        })

        return NextResponse.json({ update: updateLikesAndDislikes });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while updating likes and dislikes' }, { status: 500 });
    }
}
