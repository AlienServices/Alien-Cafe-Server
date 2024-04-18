import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

// import { useAuth, useUser } from "@clerk/clerk-expo";

const prisma = new PrismaClient()
export async function GET() {    
    console.log("hitting endpoint")
    try {
        const posts = await prisma.posts.findMany({
            where: { email: 'kalehamm@copiersutah.com' },
        })
        return NextResponse.json({Hello: posts});
    } catch (error) {
        console.log(error)
    }
    // console.log(req, "testing info")

}   