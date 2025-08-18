import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        
        // Get ID from request body instead of search params
        const { id } = data;
        
        if (!id) {
            console.error("No ID provided in request body");
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        // Check if post exists before attempting deletion
        const existingPost = await prisma.post.findUnique({
            where: { id },
            include: {
                voteRecords: true,
                comments: true,
                bookmarks: true,
                media: true,
                linkPreviews: true
            }
        });
        
        if (!existingPost) {
            console.error("Post not found with ID:", id);
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Delete the post (Prisma will handle cascading deletes automatically)
        const deletePost = await prisma.post.delete({
            where: { id },
        });
        
        return NextResponse.json({ 
            success: true, 
            message: 'Post deleted successfully',
            deletedPost: deletePost 
        });
        
    } catch (error) {
        console.error("Error deleting post:", error);
        return NextResponse.json({ 
            error: 'Failed to delete post',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}