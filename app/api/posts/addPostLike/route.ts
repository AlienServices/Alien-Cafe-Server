import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function POST(req: NextRequest) {
    const data = await req.json()
    const id = req.nextUrl.searchParams.get('id')
    const userId = data.userId; 

    try {        
        const existingPost = await prisma.post.findUnique({
            where: {
                id: id ? id : ''
            },
            select: {
                likes: true,
                dislikes: true, 
                content: true 
            }
        })

        // Ensure the post exists
        if (!existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Remove user ID from dislikes if it exists
        const updatedDislikes = existingPost.dislikes.includes(userId)
            ? existingPost.dislikes.filter(dislike => dislike !== userId) // Remove user ID if in dislikes
            : existingPost.dislikes; // Keep dislikes unchanged if not found

        // Toggle the user ID in the likes array
        const updatedLikes = existingPost.likes.includes(userId)
            ? existingPost.likes.filter(like => like !== userId) // Remove user ID if already liked
            : [...existingPost.likes, userId]; // Add user ID if not already liked

        // Update the post with the new likes and dislikes arrays, keeping the existing content
        const updateLikes = await prisma.post.update({
            where: {
                id: id ? id : ''
            },
            data: {
                likes: updatedLikes,
                dislikes: updatedDislikes, // Update dislikes as well
                content: existingPost.content, 
            },
        })

        return NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while updating likes and dislikes' }, { status: 500 });
    }
}
