import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { hasNewDrafts: false } });
  return NextResponse.json({ success: true });
} 
