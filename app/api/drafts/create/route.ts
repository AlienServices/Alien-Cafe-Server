import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

const prisma = new PrismaClient();

// Initialize Firebase Admin if not already initialized
let firebaseApp: admin.app.App | undefined;
try {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FCM_SERVICE_ACCOUNT_JSON;
    if (!serviceAccount) {
      throw new Error('FCM_SERVICE_ACCOUNT_JSON environment variable is not set');
    }
    
    try {
      const parsedServiceAccount = JSON.parse(serviceAccount);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(parsedServiceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    } catch (parseError) {
      console.error('Error parsing FCM_SERVICE_ACCOUNT_JSON:', parseError);
      throw new Error('Invalid FCM_SERVICE_ACCOUNT_JSON format');
    }
  } else {
    const app = admin.apps[0];
    if (app) {
      firebaseApp = app;
    }
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
  // Don't throw here, let the app continue without Firebase
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, content, links, primaryLinks, ownerId, collaborators, categories, subcategories, tags } = data;
    if (!ownerId || !title || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Create the draft without collaborators
    const draft = await prisma.draft.create({
      data: {
        title,
        content,
        links,
        primaryLinks,
        ownerId,
        categories: categories || [],
        subcategories: subcategories || [],
        tags: tags || [],
      },
      include: {
        owner: { select: { id: true, username: true } },
      },
    });
    // Add collaborators via join table
    if (collaborators && collaborators.length > 0) {
      await Promise.all(collaborators.map(async (userId: string) => {
        await prisma.draftCollaborator.create({
          data: { userId, draftId: draft.id },
        });
        await prisma.user.update({ where: { id: userId }, data: { hasNewDrafts: true } });
        
        // Send push notification to all devices for this user
        const user = await prisma.user.findUnique({ where: { id: userId } });
        console.log(`[Notification] Preparing to send notifications for user: ${userId}`);
        const deviceTokens = await prisma.deviceToken.findMany({ where: { userId } });
        console.log(`[Notification] Found ${deviceTokens.length} device tokens for user ${userId}`);
        
        if (!firebaseApp) {
          console.error('[Notification] Firebase not initialized, skipping notifications');
          return;
        }

        await Promise.all(deviceTokens.map(async (dt) => {
          console.log(`[Notification] Sending to device: ${dt.platform} (${dt.token.slice(0, 10)}...)`);
          try {
            const message = {
              notification: {
                title: `You've been added as a collaborator!`,
                body: `You've been added as a collaborator to '${draft.title}' by ${draft.owner.username}`,
              },
              data: {
                type: 'draft',
                draftId: draft.id,
              },
              token: dt.token,
            };

            const response = await admin.messaging().send(message);
            console.log(`[Notification] Successfully sent message:`, response);
          } catch (error) {
            console.error(`[Notification] Error sending notification:`, error);
            // Don't throw here, continue with other notifications
          }
        }));
      }));
    }
    // Fetch collaborators info
    const collaboratorsInfo = collaborators && collaborators.length > 0
      ? await prisma.user.findMany({ where: { id: { in: collaborators } }, select: { id: true, username: true } })
      : [];
    return NextResponse.json({ draft: { ...draft, collaboratorsInfo } });
  } catch (error) {
    console.error('Error creating draft:', error);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
} 