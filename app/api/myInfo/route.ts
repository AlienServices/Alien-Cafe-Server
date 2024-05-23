import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'


const prisma = new PrismaClient()
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('email')
    console.log(id, 'this is the id')
    try {
        const posts = await prisma.users.findUnique({
            where: {
                email: id ? id : undefined
            }
        })
        console.log(posts, 'this is a user')        
        return NextResponse.json({ Hello: posts });
    } catch (error) {
        console.log(error)
    }

}   