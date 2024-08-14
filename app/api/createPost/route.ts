import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    const data = await req.json()
    console.log(data.categories, 'this is the data I need')

    try {
        const test = await prisma.post.create({
            data: {
                thesis: data.thesis,
                content: data.content,
                title: data.title,
                email: data.email,
                votes: 0,
                likes: [],
                date: data.date,
                yesAction: data.yesAction,
                noAction: data.noAction,
                maybeAction: data.maybeAction,
                categories: data.categories
            }
        })
        return NextResponse.json({ hello: test });
    } catch (error) {
        console.log(error)
    }


}   