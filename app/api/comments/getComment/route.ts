import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id');
    console.log(id, 'this is the comment id');

    try {
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        // Fetch the comment and all nested replies
        const comment = await prisma.comment.findUnique({
            where: {
                id: id,
            },
            include: {
                replies: {
                    include: {
                        replies: {
                            include: {
                                replies: true, // Continue nesting as needed
                            },
                        },
                    },
                },
            },
        });

        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        return NextResponse.json({ comment: comment });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}
