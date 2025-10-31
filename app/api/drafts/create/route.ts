import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

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
    const { title, content, contentMarkdown, links, primaryLinks, ownerId, collaborators, categories, subcategories, tags, linkPreviews } = data;
    if (!ownerId || !title || (!content && !contentMarkdown)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate that owner exists
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner) {
      return NextResponse.json({ error: 'Owner user not found' }, { status: 400 });
    }

    // Prepare Markdown → HTML → Text pipeline (supports inline HTML for videos)
    const md = new MarkdownIt({ html: true, linkify: true, breaks: false });
    const ALLOWED_TAGS = [
      'p', 'br', 'a', 'strong', 'b', 'em', 'i', 'u', 'img', 'video', 'source'
    ];
    const ALLOWED_ATTR = {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
      video: ['src', 'controls'],
      source: ['src', 'type']
    } as Record<string, string[]>;

    const htmlFromMarkdown = contentMarkdown ? md.render(contentMarkdown) : undefined;
    const rawHtml = htmlFromMarkdown ?? content ?? '';
    const sanitizedHtml = sanitizeHtml(rawHtml, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTR,
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
      }
    });
    const textOnly = sanitizeHtml(sanitizedHtml, { allowedTags: [], allowedAttributes: {} }).trim();
    
    // Ensure we have valid content (not empty after sanitization)
    if (!sanitizedHtml || sanitizedHtml.trim().length === 0) {
      return NextResponse.json({ error: 'Content cannot be empty after processing' }, { status: 400 });
    }
    
    // Create the draft without collaborators
    const draft = await prisma.draft.create({
      data: {
        title,
        content: sanitizedHtml, // legacy compatibility
        contentMarkdown: contentMarkdown ?? null,
        contentHtml: sanitizedHtml,
        contentText: textOnly,
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

    // Save link previews if provided
    console.log('🎬 Link previews:', linkPreviews);
    if (linkPreviews && Array.isArray(linkPreviews) && linkPreviews.length > 0) {
      await Promise.all(linkPreviews.map(async (preview: any) => {
        console.log('🎬 Preview:', preview);
        await prisma.draftLinkPreview.create({
          data: {
            draftId: draft.id,
            url: preview.url,
            title: preview.title,
            description: preview.description,
            imageUrl: preview.imageUrl,
            domain: preview.domain,
            faviconUrl: preview.faviconUrl,
            isVideo: true, // Ensure boolean true is preserved
            embedUrl: preview.embedUrl ?? null,
            platform: preview.platform ?? null,
            author: preview.author ?? null,
            site: preview.site ?? null,
          },
        });
      }));
    }

    // Add collaborators via join table
    if (collaborators && collaborators.length > 0) {
      // Validate that all collaborator IDs exist
      const uniqueCollaborators = [...new Set(collaborators)] as string[];
      const existingUsers = await prisma.user.findMany({
        where: { id: { in: uniqueCollaborators } },
        select: { id: true }
      });
      const existingUserIds = new Set(existingUsers.map(u => u.id));
      const invalidUserIds = uniqueCollaborators.filter(id => !existingUserIds.has(id));
      
      if (invalidUserIds.length > 0) {
        return NextResponse.json({ 
          error: `Invalid collaborator user IDs: ${invalidUserIds.join(', ')}` 
        }, { status: 400 });
      }
      
      await Promise.all(uniqueCollaborators.map(async (userId: string) => {
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
    
    // Fetch link previews for response
    const savedLinkPreviews = await prisma.draftLinkPreview.findMany({
      where: { draftId: draft.id },
    });
    
    return NextResponse.json({ 
      draft: { 
        ...draft, 
        collaboratorsInfo,
        linkPreviews: savedLinkPreviews 
      } 
    });
  } catch (error) {
    console.error('Error creating draft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    
    // Return more detailed error information
    return NextResponse.json({ 
      error: 'Failed to create draft',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: 500 });
  }
} 