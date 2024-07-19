import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    const data = await req.json()
    console.log(data, 'this is the data I need')

    try {
        const test = await prisma.post.create({
            data: {
                content: data.content,
                title: data.title,
                email: data.email,
                likes: [],  
                date: data.date
            }
        })
        return NextResponse.json({ hello: test });
    } catch (error) {
        console.log(error)
    }
    

}   