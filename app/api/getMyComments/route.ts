import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    const username = req.nextUrl.searchParams.get('id');

    

    try {
        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const comment = await prisma.comment.findMany({
            where: {
                username: username,  // Ensure id is correctly passed here
            }
        });

    
        return NextResponse.json({ comment: comment });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}