import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json()
    const email = req.nextUrl.searchParams.get('email')    
    try {
        const updateLikes = await prisma.users.update({
            where: {
                email: email ? email : ''
            },
            data: {
                bio: data.bio,
                following: data.following,
                username: data.username,
            },
        })
        console.log(updateLikes, 'these areh teh likes updated')
        return await NextResponse.json({ update: updateLikes });
    } catch (error) {
        console.log(error)
    }
}   