import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';


export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id');    

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
                    where: { deletedAt: null },
                    include: {
                        replies: {
                            where: { deletedAt: null },
                            include: {
                                replies: {
                                    where: { deletedAt: null },
                                }, // Continue nesting as needed
                            },
                        },
                    },
                },
            },
        });

        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        // If the root comment itself is soft-deleted, treat it as not found
        if ((comment as any).deletedAt) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        return NextResponse.json({ comment: comment });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}
