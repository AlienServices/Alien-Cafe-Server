import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()
export async function GET(req: NextRequest) {
    
    const email = req.nextUrl.searchParams.get('email')    
    
    if (!email) {
        return NextResponse.json({ 
            error: 'Email parameter is required',
            receivedParams: req.nextUrl.searchParams.toString()
        }, { status: 400 })
    }

    if (email.trim() === '') {
        return NextResponse.json({ 
            error: 'Email parameter cannot be empty',
            receivedParams: req.nextUrl.searchParams.toString()
        }, { status: 400 })
    }

    // Additional validation for email format
    if (!email.includes('@')) {
        return NextResponse.json({ 
            error: 'Invalid email format',
            receivedEmail: email
        }, { status: 400 })
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
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
}   