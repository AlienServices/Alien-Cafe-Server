import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server';


export async function POST(req: Request) {    
    const data = await req.json();

    try {
        // Convert email and username to lowercase
        const lowerCaseData = {
            email: data.email.toLowerCase(),
            username: data.username,
            followers: [],
            following: []
        };

        const test = await prisma.user.create({
            data: lowerCaseData
        });

        return NextResponse.json({ hello: test });
    } catch (error) {
        console.log(error);
    }
}
