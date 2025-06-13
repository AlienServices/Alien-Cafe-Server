import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received registration request:', body);
    
    const { userId, token, platform } = body;
    
    if (!userId || !token || !platform) {
      console.error('Missing required fields:', { userId, token, platform });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('Attempting to register device token:', {
      userId,
      tokenLength: token.length,
      platform
    });

    try {
      const deviceToken = await prisma.deviceToken.upsert({
        where: { token },
        update: { userId, platform },
        create: { userId, token, platform },
      });
      
      console.log('Successfully registered device token:', deviceToken);
      return NextResponse.json({ success: true, deviceToken });
    } catch (error: any) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Request processing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 