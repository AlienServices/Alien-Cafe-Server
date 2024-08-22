import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    console.log(data.id)
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