import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    
    const data = await req.json()
    console.log(data, 'this is the important data')
    try {
        const updateLikes = await prisma.message.create({
            data: {
                id: data.id,
                conversationId: data.conversationId || '',
                message: data.messages,
                date: new Date(),
                userName: data.userName,
                status: data.status,
                recipient: data.recipient
            },

        });

        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}

// ...(data.messages && { message: data.messages }), 