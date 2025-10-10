import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function POST(req: NextRequest) {
    const data = await req.json()    
    const userId = data.userId;     
    try {        
        const existingPost = await prisma.post.findUnique({
            where: {
                id: data.id ? data.id : ''
            },
            select: {
                likes: true,
                dislikes: true, 
                content: true 
            }
        })

        
        if (!existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Remove user ID from likes if it exists
        const updatedLikes = existingPost.likes.includes(userId)
            ? existingPost.likes.filter(like => like !== userId) // Remove user ID from likes
            : existingPost.likes; // Keep likes unchanged if not found

        // Toggle the user ID in the dislikes array
        const updatedDislikes = existingPost.dislikes.includes(userId)
            ? existingPost.dislikes.filter(dislike => dislike !== userId) // Remove user ID if already disliked
            : [...existingPost.dislikes, userId]; // Add user ID if not already disliked

        // Update the post with the new likes and dislikes arrays, keeping the existing content
        const updateDislikes = await prisma.post.update({
            where: {
                id: data.id ? data.id : ''
            },
            data: {
                likes: updatedLikes,       // Update likes array
                dislikes: updatedDislikes, // Update dislikes array
                content: existingPost.content,
            },
        })

        return NextResponse.json({ update: updateDislikes });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while updating likes and dislikes' }, { status: 500 });
    }
}
