import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    
    const origin = req.headers.get('origin');

    // Add CORS headers to allow specific domains or all domains
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', origin || '*'); // Allow all domains or restrict to specific origin
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow specific methods
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        // Handle preflight requests
        return new Response(null, {
            headers,
            status: 204,
        });
    }
    console.log("hitting endpoint")
    try {
        const posts = await prisma.post.findMany({
            include: {
                comments: true,
            },
        });

        console.log(posts, 'this is post info with comments');
        return NextResponse.json({ Posts: posts });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while fetching posts' }, { status: 500 });
    }
}
