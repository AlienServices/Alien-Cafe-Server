import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        const { requestId, userEmail } = await req.json()

        if (!requestId || !userEmail) {
            return NextResponse.json({ error: 'Request ID and user email are required' }, { status: 400 })
        }

        // Get the friend request
        const friendRequest = await prisma.friendRequest.findUnique({
            where: { id: requestId },
            include: {
                sender: true
            }
        })

        if (!friendRequest) {
            return NextResponse.json({ error: 'Friend request not found' }, { status: 404 })
        }

        // Verify the user is the sender of the request
        if (friendRequest.sender.email !== userEmail) {
            return NextResponse.json({ error: 'Unauthorized to cancel this request' }, { status: 403 })
        }

        if (friendRequest.status !== 'pending') {
            return NextResponse.json({ error: 'Friend request has already been processed' }, { status: 409 })
        }

        // Delete the friend request
        await prisma.friendRequest.delete({
            where: { id: requestId }
        })

        return NextResponse.json({ 
            message: 'Friend request canceled successfully'
        })

    } catch (error) {
        console.error('Error canceling friend request:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
} 