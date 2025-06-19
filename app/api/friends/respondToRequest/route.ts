import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        const { requestId, action, userEmail } = await req.json()

        if (!requestId || !action || !userEmail) {
            return NextResponse.json({ error: 'Request ID, action, and user email are required' }, { status: 400 })
        }

        if (!['accept', 'reject'].includes(action)) {
            return NextResponse.json({ error: 'Action must be either "accept" or "reject"' }, { status: 400 })
        }

        // Get the friend request
        const friendRequest = await prisma.friendRequest.findUnique({
            where: { id: requestId },
            include: {
                sender: true,
                receiver: true
            }
        })

        if (!friendRequest) {
            return NextResponse.json({ error: 'Friend request not found' }, { status: 404 })
        }

        // Verify the user is the receiver of the request
        if (friendRequest.receiver.email !== userEmail) {
            return NextResponse.json({ error: 'Unauthorized to respond to this request' }, { status: 403 })
        }

        if (friendRequest.status !== 'pending') {
            return NextResponse.json({ error: 'Friend request has already been processed' }, { status: 409 })
        }

        if (action === 'accept') {
            // Add each user to the other's friends list
            const updatedSender = await prisma.user.update({
                where: { id: friendRequest.sender.id },
                data: {
                    friends: {
                        push: friendRequest.receiver.email
                    }
                }
            })

            const updatedReceiver = await prisma.user.update({
                where: { id: friendRequest.receiver.id },
                data: {
                    friends: {
                        push: friendRequest.sender.email
                    }
                }
            })

            // Update the friend request status
            await prisma.friendRequest.update({
                where: { id: requestId },
                data: { status: 'accepted' }
            })

            return NextResponse.json({ 
                message: 'Friend request accepted successfully',
                sender: {
                    id: updatedSender.id,
                    email: updatedSender.email,
                    username: updatedSender.username
                },
                receiver: {
                    id: updatedReceiver.id,
                    email: updatedReceiver.email,
                    username: updatedReceiver.username
                }
            })

        } else {
            // Reject the request
            await prisma.friendRequest.update({
                where: { id: requestId },
                data: { status: 'rejected' }
            })

            return NextResponse.json({ 
                message: 'Friend request rejected successfully'
            })
        }

    } catch (error) {
        console.error('Error responding to friend request:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 