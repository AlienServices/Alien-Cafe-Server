import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    console.log("hitting endpoint")
    const data = await req.json()
    console.log(data, "this is the data that I need")
    try {
        const test = await prisma.user.create({
            data: {
                email: data.email,
                username: data.username
            }
        })
        return NextResponse.json({ hello: test });
    } catch (error) {
        console.log(error)
    }
    
}   