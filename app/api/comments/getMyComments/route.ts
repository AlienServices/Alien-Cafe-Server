import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
    const username = req.nextUrl.searchParams.get('id');    

    try {

        const comment = await prisma.comment.findMany({
            where: {
                username: username || '',  // Ensure id is correctly passed here
            }
        });

    
        return NextResponse.json({ comment: comment });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}
