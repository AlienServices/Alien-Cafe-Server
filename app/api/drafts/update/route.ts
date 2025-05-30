import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest) {
  try {
    const { draftId, userId, title, content, links, primaryLinks, collaborators, categories, subcategories, tags } = await req.json();
    if (!draftId || !userId) {
      return NextResponse.json({ error: 'Missing draftId or userId' }, { status: 400 });
    }
    // Check if user is owner or collaborator (join table)
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    const isOwner = draft.ownerId === userId;
    const isCollaborator = await prisma.draftCollaborator.findFirst({ where: { draftId, userId } });
    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    // Update draft fields
    const updatedDraft = await prisma.draft.update({
      where: { id: draftId },
      data: {
        title,
        content,
        links,
        primaryLinks,
        categories: categories || draft.categories,
        subcategories: subcategories || draft.subcategories,
        tags: tags || draft.tags,
      },
    });
    // Update collaborators (add/remove)
    if (collaborators) {
      // Get current collaborators
      const current = await prisma.draftCollaborator.findMany({ where: { draftId } });
      const currentIds = current.map(dc => dc.userId);
      // Add new collaborators
      const toAdd = collaborators.filter((id: string) => !currentIds.includes(id));
      await Promise.all(toAdd.map(async (userId: string) => {
        await prisma.draftCollaborator.create({ data: { userId, draftId } });
        await prisma.user.update({ where: { id: userId }, data: { hasNewDrafts: true } });
        // Send push notification to all devices for this user
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const deviceTokens = await prisma.deviceToken.findMany({ where: { userId } });
        await Promise.all(deviceTokens.map(async (dt: any) => {
          await fetch(`${process.env.PUSH_API_URL || 'http://localhost:3000'}/api/push/sendNotification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              token: dt.token,
              title: `You've been added as a collaborator!`,
              body: `You've been added as a collaborator to '${draft.title}' by ${user?.username}`,
              data: { type: 'draft', draftId },
            }),
          });
        }));
      }));
      // Remove old collaborators
      const toRemove = currentIds.filter(id => !collaborators.includes(id));
      await prisma.draftCollaborator.deleteMany({ where: { draftId, userId: { in: toRemove } } });
    }
    // Fetch collaborators info
    const collaboratorsInfo = collaborators && collaborators.length > 0
      ? await prisma.user.findMany({ where: { id: { in: collaborators } }, select: { id: true, username: true } })
      : [];
    return NextResponse.json({ draft: { ...updatedDraft, collaboratorsInfo } });
  } catch (error) {
    console.error('Error updating draft:', error);
    return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
  }
} 