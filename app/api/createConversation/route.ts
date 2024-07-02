import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    console.log(data.recipient, 'this is data')

    try {
        const updateLikes = await prisma.conversation.create({
            data: {

                me: data.me,
                roomName: data.roomName,
                recipient: data.recipient,
                date: new Date()
            }
        })
        await prisma.message.createMany({
            data: [{
                conversationId: updateLikes.id,
                message: data.messages[0].message,
                status: 'Delivered',
                userName: data.messages[0].userName,
                date: new Date(),
                recipient: data.recipient
                // recipient: data.recipient
            }]
        })

        return NextResponse.json({ update: updateLikes })
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}