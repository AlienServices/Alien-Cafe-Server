import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get("userId") || undefined;

    try {
        const posts = await prisma.post.findMany({
            where: { 
                id: userId
            },
            include: {
                comments: true,
            },
        });
        
        return NextResponse.json({ posts });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while fetching posts' }, { status: 500 });
    }
}
