import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()  
    console.log(data, 'whole request')  
    try {
        const updateLikes = await prisma.message.update({
            where: {
                ...(data.id && { id: data.id })
            },
            data: {
                status: data.status
            },
        })
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}

