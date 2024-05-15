import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    const id = req.nextUrl.searchParams.get('id')

    let likes = data.likes
    console.log(data, 'this is the important data')
    if (data.likes.length < 1) {
        likes = []
    } 

    try {
        const updateLikes = await prisma.posts.update({
            where: {
                id: id ? id : ''
            },
            data: {
                likes: likes,
            },
        })
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}   