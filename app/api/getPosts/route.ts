import { PrismaClient } from '@prisma/client'
import { NextResponse, NextRequest } from 'next/server'

// import { useAuth, useUser } from "@clerk/clerk-expo";

const prisma = new PrismaClient()
export async function GET() {

    console.log("hitting endpoint")
    try {
        const posts = await prisma.post.findMany()
        console.log(await posts, 'this is post info')
        return NextResponse.json({ Posts: await posts });
    } catch (error) {
        console.log(error)
    }

}   