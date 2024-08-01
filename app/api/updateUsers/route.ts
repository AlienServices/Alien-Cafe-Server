import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    const data = await req.json();
    const email = req.nextUrl.searchParams.get('email');
    
    try {
        // Fetch the current voted array
        const user = await prisma.user.findUnique({
            where: {
                email: email ? email : ''
            },
            select: {
                voted: true
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Append the new vote to the current voted array
        const updatedVoted = user.voted ? [...user.voted, data.vote] : [data.vote];

        
        const updateLikes = await prisma.user.update({
            where: {
                email: email ? email : ''
            },
            data: {
                voted: updatedVoted
            },
        });

        console.log(updateLikes, 'these are the likes updated');
        return NextResponse.json({ update: updateLikes });

    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
    }
}