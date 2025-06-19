import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        const { userEmail, friendEmail } = await req.json()

        if (!userEmail || !friendEmail) {
            return NextResponse.json({ error: 'User email and friend email are required' }, { status: 400 })
        }

        if (userEmail === friendEmail) {
            return NextResponse.json({ error: 'Cannot unfriend yourself' }, { status: 400 })
        }

        // Get both users
        const user = await prisma.user.findUnique({
            where: { email: userEmail }
        })

        const friend = await prisma.user.findUnique({
            where: { email: friendEmail }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        if (!friend) {
            return NextResponse.json({ error: 'Friend not found' }, { status: 404 })
        }

        // Check if they are actually friends
        if (!user.friends.includes(friendEmail) || !friend.friends.includes(userEmail)) {
            return NextResponse.json({ error: 'Users are not friends' }, { status: 409 })
        }

        // Remove each user from the other's friends list
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                friends: {
                    set: user.friends.filter(email => email !== friendEmail)
                }
            }
        })

        const updatedFriend = await prisma.user.update({
            where: { id: friend.id },
            data: {
                friends: {
                    set: friend.friends.filter(email => email !== userEmail)
                }
            }
        })

        // Delete any existing friend requests between them
        await prisma.friendRequest.deleteMany({
            where: {
                OR: [
                    { senderId: user.id, receiverId: friend.id },
                    { senderId: friend.id, receiverId: user.id }
                ]
            }
        })

        return NextResponse.json({ 
            message: 'Friend removed successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                username: updatedUser.username
            },
            friend: {
                id: updatedFriend.id,
                email: updatedFriend.email,
                username: updatedFriend.username
            }
        })

    } catch (error) {
        console.error('Error removing friend:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 