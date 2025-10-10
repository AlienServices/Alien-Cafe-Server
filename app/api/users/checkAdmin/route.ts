import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


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
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true
            }
        })
        
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }
        
        return NextResponse.json({ 
            isAdmin: user.isAdmin || false,
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        })
    } catch (error) {
        console.error('Error checking admin status:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
} 
