import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';


export async function POST(req: NextRequest) {
    try {
        console.log('=== POST DELETION REQUEST STARTED ===');
        const data = await req.json();
        
        // Get ID from request body instead of search params
        const { id } = data;
        
        console.log('Request data received:', { id, timestamp: new Date().toISOString() });
        
        if (!id) {
            console.error("No ID provided in request body");
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        console.log(`Checking if post with ID ${id} exists...`);
        
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

        console.log(`Post found:`, {
            id: existingPost.id,
            title: existingPost.title,
            userId: existingPost.userId,
            voteRecordsCount: existingPost.voteRecords?.length || 0,
            commentsCount: existingPost.comments?.length || 0,
            bookmarksCount: existingPost.bookmarks?.length || 0,
            mediaCount: existingPost.media?.length || 0,
            linkPreviewsCount: existingPost.linkPreviews?.length || 0
        });

        console.log(`Starting deletion of post ${id}...`);
        
        // Delete the post (Prisma will handle cascading deletes automatically)
        const deletePost = await prisma.post.delete({
            where: { id },
        });
        
        console.log(`Post ${id} deleted successfully:`, {
            deletedPostId: deletePost.id,
            deletedAt: new Date().toISOString()
        });
        
        console.log('=== POST DELETION REQUEST COMPLETED ===');
        
        return NextResponse.json({ 
            success: true, 
            message: 'Post deleted successfully',
            deletedPost: deletePost 
        });
        
    } catch (error) {
        console.error("=== POST DELETION ERROR ===");
        console.error("Error deleting post:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            timestamp: new Date().toISOString()
        });
        console.error("=== END ERROR LOG ===");
        
        return NextResponse.json({ 
            error: 'Failed to delete post',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
