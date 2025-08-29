import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '3', 10);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10);
    
    console.log('🔍 [Server] getMyPosts called with:', { email, limit, offset });
    
    if (!email) {
        console.error('❌ [Server] No email provided');
        return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    try {
        const posts = await prisma.post.findMany({
            where: {
                email
            },
            include: {
                categories: true,
                linkPreviews: true,
                media: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: {
                date: 'desc'
            },
            take: limit,
            skip: offset
        });
        
        console.log('🔍 [Server] Found posts:', posts.length);
        return NextResponse.json({ Posts: posts });
    } catch (error) {
        console.error('❌ [Server] Database error:', error);
        return NextResponse.json({ error: 'Database error occurred' }, { status: 500 });
    }
}   