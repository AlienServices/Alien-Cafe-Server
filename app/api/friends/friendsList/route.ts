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

        // Get friends list with full user details
        const friends = await prisma.user.findMany({
            where: {
                email: {
                    in: user.friends
                }
            },
            select: {
                id: true,
                email: true,
                username: true,
                bio: true,
                blurhash: true,
                followers: true,
                following: true
            },
            orderBy: {
                username: 'asc'
            }
        })

        return NextResponse.json({ 
            friends,
            count: friends.length
        })

    } catch (error) {
        console.error('Error fetching friends list:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 
