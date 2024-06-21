import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    const id = req.nextUrl.searchParams.get('id')
    console.log(data.messages, 'this is the important data')
    try {
        const updateLikes = await prisma.conversation.create({
            data: {
                messages: {
                    createMany: {
                        data: {
                            message: data.messages[0].message,
                            status: 'Delivered',
                            userName: data.messages[0].userName,
                            date: new Date()
                        }
                    }
                },
                me: data.me,
                roomName: data.roomName,
                recipient: data.recipient,
                date: new Date,
            },
            // include: {

            // }
        })
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}   