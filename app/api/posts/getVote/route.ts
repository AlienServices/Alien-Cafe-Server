import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const postId = req.nextUrl.searchParams.get('postId');
    const userId = req.nextUrl.searchParams.get('userId'); 
    try {        
        const userVote = await prisma.vote.findFirst({
            where: {
                postId: postId ? postId : undefined,
                userId: userId ? userId : undefined,
            },
        });
        // Return 200 with null vote if no vote exists
        return NextResponse.json({ userVote });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}