import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    const id = req.nextUrl.searchParams.get('id')    
    try {
        const updateLikes = await prisma.users.update({
            where: {
                id: id ? id : ''
            },
            data: {
                bio: data.bio,
                followers: data.followers,
                username: data.username,
            },
        })
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}   