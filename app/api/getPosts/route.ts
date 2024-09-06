import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET() {
    console.log("hitting endpoint")
    try {
        // Fetch all posts along with their related comments
        const posts = await prisma.post.findMany({
            include: {
                comments: true, // Assumes there is a `comments` relation in your Prisma schema
            },
        });
        
        console.log(posts, 'this is post info with comments');
        return NextResponse.json({ Posts: posts });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while fetching posts' }, { status: 500 });
    }
}
