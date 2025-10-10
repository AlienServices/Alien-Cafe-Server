import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function POST(req: NextRequest) {
    const data = await req.json()      
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

