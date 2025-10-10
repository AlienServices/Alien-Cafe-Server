import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server';


export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    const draftId = req.nextUrl.searchParams.get('draftId');
    if (!userId) {
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
          media: {
            orderBy: { order: 'asc' }
          },
          linkPreviews: true,
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
        linkPreviews: true,
      },
    });
    const draftsWithCollaborators = drafts.map(draft => ({
      ...draft,
      collaboratorsInfo: draft.collaborators.map(dc => dc.user),
    }));
    return NextResponse.json({ drafts: draftsWithCollaborators });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json({ error: 'Failed to fetch drafts' }, { status: 500 });
  }
} 
