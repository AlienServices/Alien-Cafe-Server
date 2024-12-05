import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    console.log("hitting endpoint");
    const data = await req.json();

    try {
        // Convert email and username to lowercase
        const lowerCaseData = {
            email: data.email.toLowerCase(),
            username: data.username.toLowerCase(),
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