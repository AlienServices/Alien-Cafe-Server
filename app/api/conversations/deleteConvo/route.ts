import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()    
    console.log(data.id, 'this is the important data')
    try {
        const deleteConvo = await prisma.conversation.delete({
            where: {
                id: data.id
            },
            
        })
        return await NextResponse.json({ update: deleteConvo });
    } catch (error) {
        console.log(error)
    }
}   