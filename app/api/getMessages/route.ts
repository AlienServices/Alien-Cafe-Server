import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {    
    const conversationId = req.nextUrl.searchParams.get('conversationId')
    try {

        const lastMessage = await prisma.message.findMany({
            where: {
                conversationId: conversationId || ''
            },
            orderBy: {
                date: 'desc'
            },
            take: 1
        })
        return NextResponse.json({ Response: lastMessage });
    } catch (error) {
        console.log(error)
    }
    // console.log(req, "testing info")

}   