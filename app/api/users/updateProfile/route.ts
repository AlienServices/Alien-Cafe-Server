// pages/api/users/updateProfile.ts
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
  const data = await req.json();
  const { id, bio } = data;

  try {
    if (!id) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { bio }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
