import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'


const prisma = new PrismaClient()
export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('email')
    console.log(id, 'this is the id')
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: id ? id : undefined
            }
        })
        
        return NextResponse.json({ user });
    } catch (error) {
        console.log(error)
    }

}   