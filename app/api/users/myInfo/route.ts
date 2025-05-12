import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()
export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get('email')    
    
    if (!email) {
        return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                email: {
                    equals: email,
                    mode: 'insensitive'  // This will make the search case-insensitive
                }
            }
        })
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
}   