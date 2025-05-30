import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function DELETE(req: NextRequest) {
  try {
    const { draftId, userId } = await req.json();
    if (!draftId || !userId) {
      return NextResponse.json({ error: 'Missing draftId or userId' }, { status: 400 });
    }
    // Check if user is owner
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    if (draft.ownerId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    // Delete collaborators first
    await prisma.draftCollaborator.deleteMany({
      where: { draftId },
    });
    await prisma.draft.delete({ where: { id: draftId } });
    return NextResponse.json({ message: 'Draft deleted' });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
} 