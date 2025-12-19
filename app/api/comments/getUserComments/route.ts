import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id')
    try {
        const comments = await prisma.comment.findMany({
            where: {
                userId: id || '',
                deletedAt: null,
            },
            orderBy: { date: 'desc' },
        })        
        return NextResponse.json({ comments });
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }    

}   
