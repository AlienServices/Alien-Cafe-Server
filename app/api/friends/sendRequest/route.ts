import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        const { senderEmail, receiverEmail } = await req.json()

        if (!senderEmail || !receiverEmail) {
            return NextResponse.json({ error: 'Sender and receiver emails are required' }, { status: 400 })
        }

        if (senderEmail === receiverEmail) {
            return NextResponse.json({ error: 'Cannot send friend request to yourself' }, { status: 400 })
        }

        // Get sender and receiver users
        const sender = await prisma.user.findUnique({
            where: { email: senderEmail }
        })

        const receiver = await prisma.user.findUnique({
            where: { email: receiverEmail }
        })

        if (!sender) {
            return NextResponse.json({ error: 'Sender not found' }, { status: 404 })
        }

        if (!receiver) {
            return NextResponse.json({ error: 'Receiver not found' }, { status: 404 })
        }

        // Check if friend request already exists
        const existingRequest = await prisma.friendRequest.findFirst({
            where: {
                OR: [
                    { senderId: sender.id, receiverId: receiver.id },
                    { senderId: receiver.id, receiverId: sender.id }
                ]
            }
        })

        if (existingRequest) {
            return NextResponse.json({ error: 'Friend request already exists' }, { status: 409 })
        }

        // Check if they are already friends
        if (sender.friends.includes(receiverEmail) || receiver.friends.includes(senderEmail)) {
            return NextResponse.json({ error: 'Users are already friends' }, { status: 409 })
        }

        // Create friend request
        const friendRequest = await prisma.friendRequest.create({
            data: {
                senderId: sender.id,
                receiverId: receiver.id,
                status: 'pending'
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        email: true,
                        username: true
                    }
                },
                receiver: {
                    select: {
                        id: true,
                        email: true,
                        username: true
                    }
                }
            }
        })

        // Send push notification to receiver
        try {
            const receiverDeviceTokens = await prisma.deviceToken.findMany({
                where: { userId: receiver.id }
            })

            if (receiverDeviceTokens.length > 0) {
                const notificationData = {
                    title: 'New Friend Request',
                    body: `${sender.username} wants to be your friend!`,
                    data: {
                        type: 'friend_request',
                        senderId: sender.id,
                        senderUsername: sender.username,
                        requestId: friendRequest.id
                    }
                }

                // Send to all device tokens for the receiver
                for (const deviceToken of receiverDeviceTokens) {
                    await fetch(`${process.env.NEXT_PUBLIC_APP_SERVER_BASE_URL || 'http://localhost:3000'}/api/push/sendNotification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: deviceToken.token,
                            title: notificationData.title,
                            body: notificationData.body,
                            data: notificationData.data
                        })
                    })
                }
            }
        } catch (notificationError) {
            console.error('Failed to send friend request notification:', notificationError)
            // Don't fail the request if notification fails
        }

        return NextResponse.json({ 
            message: 'Friend request sent successfully',
            friendRequest 
        })

    } catch (error) {
        console.error('Error sending friend request:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 