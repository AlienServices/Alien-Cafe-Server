import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json();
    console.log(data, "this is the data");

    try {
        // Create the new comment, including parentId if it exists
        const newComment = await prisma.comment.create({
            data: {
                comment: data.comment,
                username: data.userName,
                postId: data.postId,
                userId: data.userId,
                parentId: data.commentId || null,  // Include parentId if provided, otherwise set to null
            },
        });

        // Fetch all comments related to the postId after the new comment is created
        const allComments = await prisma.comment.findMany({
            where: {
                postId: data.postId,
            },
            orderBy: {
                date: 'asc',  // Order comments by date in ascending order
            },
        });

        // Return the updated list of comments
        return NextResponse.json({ comments: allComments });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}