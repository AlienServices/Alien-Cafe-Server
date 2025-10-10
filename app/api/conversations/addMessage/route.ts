import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(req: NextRequest) {    
    const data = await req.json()    
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
