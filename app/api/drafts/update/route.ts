import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const prisma = new PrismaClient();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

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
          try {
            const message = {
              notification: {
                title: `You've been added as a collaborator!`,
                body: `You've been added as a collaborator to '${draft.title}' by ${user?.username}`,
              },
              data: {
                type: 'draft',
                draftId,
              },
              token: dt.token,
            };

            const response = await admin.messaging().send(message);
            console.log(`[Notification] Successfully sent message:`, response);
          } catch (error) {
            console.error(`[Notification] Error sending notification:`, error);
          }
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