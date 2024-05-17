import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    const id = req.nextUrl.searchParams.get('id')
    console.log(data, 'this is the important data')
    try {
        const updateLikes = await prisma.posts.deleteMany({
            where: {
                id: {
                    contains: id ? id : ''
                }
            }
        })
        console.log(updateLikes, 'this is a test')
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}   