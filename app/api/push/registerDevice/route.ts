import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { log } from 'console';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log('registerDevice');
  console.log(req);
  const { userId, token, platform } = await req.json();
  console.log(userId, token, platform);
  if (!userId || !token || !platform) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  log('registerDevice', userId, token, platform);
  try {
    const deviceToken = await prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform },
      create: { userId, token, platform },
    });
    return NextResponse.json({ success: true, deviceToken });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 