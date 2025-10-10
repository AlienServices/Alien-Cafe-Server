import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function POST(req: NextRequest) {
    const data = await req.json()    
    try {
        const deleteConvo = await prisma.comment.delete({
            where: {
                id: data.id || ''
            },

        })
        return await NextResponse.json({ update: deleteConvo });
    } catch (error) {
        console.log(error)
    }
}   

/////
