import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id')
    console.log(id, 'this is the id')
    try {
        const test = await prisma.messages.findFirst({
            where: {
                id: id || ''
            }
        })
        console.log(test, 'this is the test')
        return NextResponse.json({ Posts: test });
    } catch (error) {
        console.log(error)
    }
    // console.log(req, "testing info")

}   