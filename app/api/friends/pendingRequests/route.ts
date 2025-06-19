import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

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

        // Get pending friend requests where user is the receiver
        const pendingRequests = await prisma.friendRequest.findMany({
            where: {
                receiverId: user.id,
                status: 'pending'
            },
            include: {
                sender: {
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
            pendingRequests,
            count: pendingRequests.length
        })

    } catch (error) {
        console.error('Error fetching pending friend requests:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 