import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
    try {
        const email = req.nextUrl.searchParams.get('email')

        if (!email) {
            return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get sent friend requests
        const sentRequests = await prisma.friendRequest.findMany({
            where: {
                senderId: user.id,
                status: 'pending'
            },
            include: {
                receiver: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        bio: true,
                        blurhash: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({ 
            sentRequests,
            count: sentRequests.length
        })

    } catch (error) {
        console.error('Error fetching sent friend requests:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 
