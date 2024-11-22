import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    const category = req.nextUrl.searchParams.get('category');
    try {
        const posts = await prisma.post.findMany({
            where: {
                categories: {
                    has: category
                },
                
            },
            include: {
                owner: true
            }
        });

        console.log(posts, 'this is post info with comments');
        return NextResponse.json({ posts });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while fetching posts' }, { status: 500 });
    }
}
