import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()    
    console.log(data.me, 'this is the important data')
    try {
        const updateLikes = await prisma.messages.delete({
            where: {
                id: data.id
            },
            
        })
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}   