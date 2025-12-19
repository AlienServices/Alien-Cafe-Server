import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id');    
    try {
        

        const comment = await prisma.comment.findMany({
            where: {
                postId: id || '',
                deletedAt: null,
            }
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
