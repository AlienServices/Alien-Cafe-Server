import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    console.log("hitting endpoint")
    const data = await req.json()

    try {
        console.log(data.email)
        const test = await prisma.user.create({
            data: {
                email: data.email,
                username: data.username,
                followers: [],
                following: []
            }
        })
        return NextResponse.json({ hello: test });
    } catch (error) {
        console.log(error)
    }

}   