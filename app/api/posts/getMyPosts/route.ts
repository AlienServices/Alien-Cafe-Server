import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    console.log('Request received')
    const email = req.nextUrl.searchParams.get('email')
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '3', 10);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10);
    try {
        const test = await prisma.post.findMany({
            where: {
                email
            },
            include: {
                categories: true
            },
            take: limit,
            skip: offset
        })
        console.log('Response structure:', JSON.stringify(test, null, 2))
        return NextResponse.json({ Posts: test });
    } catch (error) {
        console.log(error)
    }
    // console.log(req, "testing info")

}   