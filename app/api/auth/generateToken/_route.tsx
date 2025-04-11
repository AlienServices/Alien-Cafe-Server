// import { PrismaClient } from "@prisma/client";
// import { NextResponse, NextRequest } from "next/server";
// import jwt from 'jsonwebtoken'

// const generateToken = (userId: string) => {
//     return jwt.sign({ id: userId }, '', { expiresIn: '30d' })
// }

// export async function POST(req: NextRequest) {
//     const data = await req.json()
//     try {
//         const response = generateToken(data.id)
//         return NextResponse.json({ response })
//     } catch (err) {
//         console.log(err, 'this is the error')
//     }
// }
