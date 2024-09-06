import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    const id = req.nextUrl.searchParams.get('id')
    const userId = data.userId; // Assuming the user ID is sent in the request body

    try {
        // Fetch the existing post to get current likes and content
        const existingPost = await prisma.post.findUnique({
            where: {
                id: id ? id : ''
            },
            select: {
                likes: true,
                content: true // Fetch existing content to keep it unchanged
            }
        })

        // Ensure the post exists
        if (!existingPost) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Toggle the user ID in the likes array
        const updatedLikes = existingPost.likes.includes(userId)
            ? existingPost.likes.filter(like => like !== userId) // Remove user ID if already liked
            : [...existingPost.likes, userId]; // Add user ID if not already liked

        // Update the post with the new likes array, keeping the existing content
        const updateLikes = await prisma.post.update({
            where: {
                id: id ? id : ''
            },
            data: {
                likes: updatedLikes,
                content: existingPost.content, 
            },
        })

        return NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while updating likes' }, { status: 500 });
    }
}
