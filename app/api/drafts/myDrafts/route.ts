import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const draftId = req.nextUrl.searchParams.get('draftId');
    debugger; // After extracting userId and draftId
    if (!userId) {
      debugger; // Missing userId
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    if (draftId) {
      // Fetch a single draft if draftId is provided
      const draft = await prisma.draft.findFirst({
        where: {
          id: draftId,
          OR: [
            { ownerId: userId },
            { collaborators: { some: { userId } } },
          ],
        },
        include: {
          owner: { select: { id: true, username: true } },
          collaborators: { include: { user: { select: { id: true, username: true } } } },
        },
      });
      if (!draft) {
        return NextResponse.json({ error: 'Draft not found or access denied' }, { status: 404 });
      }
      const collaboratorsInfo = draft.collaborators.map(dc => dc.user);
      const draftWithCollaborators = { ...draft, collaboratorsInfo };
      return NextResponse.json({ draft: draftWithCollaborators });
    }
    // Fetch all drafts for user (owner or collaborator)
    const drafts = await prisma.draft.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { collaborators: { some: { userId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, username: true } },
        collaborators: { include: { user: { select: { id: true, username: true } } } },
      },
    });
    const draftsWithCollaborators = drafts.map(draft => ({
      ...draft,
      collaboratorsInfo: draft.collaborators.map(dc => dc.user),
    }));
    return NextResponse.json({ drafts: draftsWithCollaborators });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    debugger; // On error
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
} 