import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    try {
        const updateLikes = await prisma.message.updateMany({
            where: {
                conversationId: data.conversationId
            },
            data: {
                status: "Read"
            },
        })
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}

