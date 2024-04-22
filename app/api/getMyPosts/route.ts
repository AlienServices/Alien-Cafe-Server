import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    const email = req.url
    console.log(email, "this is req data")
    
    
    try {
        const test = await prisma.posts.findMany({
            where: {                
                email: email
            }
        })
        return NextResponse.json({ hello: test });
    } catch (error) {
        console.log(error)
    }
    // console.log(req, "testing info")

}   