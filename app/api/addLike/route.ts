import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()


export async function POST(req: NextRequest) {
    const data = await req.json()
    console.log(data, 'this is the data I need')
    const email = req.nextUrl.searchParams.get('email')

    try {
        const get = await prisma.posts.findUnique({
            where: {
                id: '',
            },
        })
        const updateLikes = await prisma.posts.update({
            where: {
                id: '',
                email: ''
            },
            data: {
                likes: 'Viola the Magnificent',
            },
        })
        return await NextResponse.json({ get: get, update: updateLikes });
    } catch (error) {
        console.log(error)
    }
    // console.log(req, "testing info")

}   