import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'


const prisma = new PrismaClient()
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id')

    try {
        const posts = await prisma.post.findUnique({
            where: {
                id: id ? id : undefined
            }
        })
        console.log(posts)        
        return NextResponse.json({ Hello: [posts] });
    } catch (error) {
        console.log(error)
    }

}   