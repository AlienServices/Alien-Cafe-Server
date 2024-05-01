import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'


export async function GET() {    
    console.log("hitting endpoint")    
    return NextResponse.json({kale:'working'})
    // console.log(req, "testing info")
}   