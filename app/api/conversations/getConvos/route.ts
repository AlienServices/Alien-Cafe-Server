import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
    // try {
    //     const email = req.nextUrl.searchParams.get('email')        
    //     const test = await prisma.conversation.findMany({
    //         where: {
    //             OR: [
    //                 {
    //                     me: email || ''
    //                 },
    //                 {
    //                     recipient: email || '',

    //                 }
    //             ]
    //         }
    //     })        
        return NextResponse.json({ working: "test" });
    // } catch (error) {
    //     console.log(error)
    // }
    // console.log(req, "testing info")

}   
