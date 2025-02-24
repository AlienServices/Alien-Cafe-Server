import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id')
    try {
        const comments = await prisma.comment.findFirst({
            where: {
                userId: id || ''
            }
        })        
        return NextResponse.json({ comments });
    } catch (error) {
        console.log(error)
    }    

}   