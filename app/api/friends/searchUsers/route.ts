import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
    console.log('Search users route hit')
    try {
        const searchQuery = req.nextUrl.searchParams.get('query')
        const currentUserEmail = req.nextUrl.searchParams.get('currentUserEmail')
        console.log('Search query:', searchQuery)
        console.log('Current user email:', currentUserEmail)

        if (!searchQuery || !currentUserEmail) {
            return NextResponse.json({ error: 'Search query and current user email are required' }, { status: 400 })
        }
        console.log('Search query and current user email are required')
        // Get current user
        const currentUser = await prisma.user.findUnique({
            where: { email: currentUserEmail }
        })
        console.log('Current user:', currentUser)
        if (!currentUser) {
            return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
        }
        console.log('Current user not found')
        // Search for users by username or email (excluding current user)
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            {
                                username: {
                                    contains: searchQuery,
                                    mode: 'insensitive'
                                }
                            },
                            {
                                email: {
                                    contains: searchQuery,
                                    mode: 'insensitive'
                                }
                            }
                        ]
                    },
                    {
                        email: {
                            not: currentUserEmail
                        }
                    }
                ]
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
            },
            take: 20 // Limit results
        })
        console.log('Users:', users)
        // For each user, check if they are already friends or if there's a pending request
        const usersWithStatus = await Promise.all(
            users.map(async (user) => {
                // Check if they are friends
                const isFriend = currentUser.friends.includes(user.email)

                // Check if there's a pending friend request
                const pendingRequest = await prisma.friendRequest.findFirst({
                    where: {
                        OR: [
                            { senderId: currentUser.id, receiverId: user.id },
                            { senderId: user.id, receiverId: currentUser.id }
                        ],
                        status: 'pending'
                    }
                })

                let requestStatus = null
                if (pendingRequest) {
                    requestStatus = pendingRequest.senderId === currentUser.id ? 'sent' : 'received'
                }

                return {
                    ...user,
                    isFriend,
                    requestStatus
                }
            })
        )
        console.log('Users with status:', usersWithStatus)
        return NextResponse.json({ 
            users: usersWithStatus,
            count: usersWithStatus.length
        })
        console.log('Users with status:', usersWithStatus)
    } catch (error) {
        console.error('Error searching users:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 