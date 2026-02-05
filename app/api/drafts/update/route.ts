import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import * as admin from "firebase-admin";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

// Initialize Firebase Admin if not already initialized
let firebaseApp: admin.app.App | undefined;
try {
  if (!admin.apps.length) {
    const serviceAccount = process.env.FCM_SERVICE_ACCOUNT_JSON;
    if (!serviceAccount) {
      throw new Error(
        "FCM_SERVICE_ACCOUNT_JSON environment variable is not set",
      );
    }

    try {
      const parsedServiceAccount = JSON.parse(serviceAccount);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(parsedServiceAccount),
      });
      console.log("Firebase Admin initialized successfully");
    } catch (parseError) {
      console.error("Error parsing FCM_SERVICE_ACCOUNT_JSON:", parseError);
      throw new Error("Invalid FCM_SERVICE_ACCOUNT_JSON format");
    }
  } else {
    const app = admin.apps[0];
    if (app) {
      firebaseApp = app;
    }
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error);
  // Don't throw here, let the app continue without Firebase
}

export async function PUT(req: NextRequest) {
  try {
    const {
      draftId,
      userId,
      title,
      content,
      contentMarkdown,
      links,
      primaryLinks,
      collaborators,
      categories,
      subcategories,
      tags,
      linkPreviews,
      yesAction,
      probablyYesAction,
      maybeAction,
      probablyNoAction,
      noAction,
    } = await req.json();

    console.log("📝 Draft update request:", {
      draftId,
      userId,
      hasTitle: !!title,
      hasContent: !!content,
    });

    if (!draftId || !userId) {
      console.error("❌ Missing draftId or userId:", { draftId, userId });
      return NextResponse.json(
        { error: "Missing draftId or userId" },
        { status: 400 },
      );
    }

    // Check if user is owner or collaborator (join table)
    console.log("🔍 Looking for draft with ID:", draftId);
    const draft = await prisma.draft.findUnique({ where: { id: draftId } });

    if (!draft) {
      console.error("❌ Draft not found:", draftId);
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    console.log("✅ Draft found:", {
      id: draft.id,
      ownerId: draft.ownerId,
      title: draft.title,
    });
    const isOwner = draft.ownerId === userId;
    const isCollaborator = await prisma.draftCollaborator.findFirst({
      where: { draftId, userId },
    });
    if (!isOwner && !isCollaborator) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    // Prepare Markdown → HTML → Text pipeline
    const md = new MarkdownIt({ html: true, linkify: true, breaks: false });
    const ALLOWED_TAGS = [
      "p",
      "br",
      "a",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "img",
      "video",
      "source",
    ];
    const ALLOWED_ATTR = {
      a: ["href", "target", "rel"],
      img: ["src", "alt"],
      video: ["src", "controls"],
      source: ["src", "type"],
    } as Record<string, string[]>;

    const htmlFromMarkdown = contentMarkdown
      ? md.render(contentMarkdown)
      : undefined;
    const rawHtml = htmlFromMarkdown ?? content ?? "";
    const sanitizedHtml = sanitizeHtml(rawHtml, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTR,
      transformTags: {
        a: sanitizeHtml.simpleTransform("a", {
          rel: "noopener noreferrer",
          target: "_blank",
        }),
      },
    });
    const textOnly = sanitizeHtml(sanitizedHtml, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();

    // Update draft fields
    const updatedDraft = await prisma.draft.update({
      where: { id: draftId },
      data: {
        title,
        content: sanitizedHtml, // legacy compatibility
        contentMarkdown: contentMarkdown ?? null,
        contentHtml: sanitizedHtml,
        contentText: textOnly,
        links,
        primaryLinks,
        categories: categories || draft.categories,
        subcategories: subcategories || draft.subcategories,
        tags: tags || draft.tags,
        yesAction,
        probablyYesAction,
        maybeAction,
        probablyNoAction,
        noAction,
      },
    });

    // Update link previews if provided
    if (linkPreviews !== undefined) {
      // Delete existing link previews
      await prisma.draftLinkPreview.deleteMany({
        where: { draftId },
      });

      // Create new link previews if any
      if (Array.isArray(linkPreviews) && linkPreviews.length > 0) {
        await Promise.all(
          linkPreviews.map(async (preview: any) => {
            await prisma.draftLinkPreview.create({
              data: {
                draftId,
                url: preview.url,
                title: preview.title,
                description: preview.description,
                imageUrl: preview.imageUrl,
                domain: preview.domain,
                faviconUrl: preview.faviconUrl,
                isVideo: preview.isVideo === true || preview.isVideo === "true", // Ensure boolean true is preserved
                embedUrl: preview.embedUrl ?? null,
                platform: preview.platform ?? null,
                author: preview.author ?? null,
                site: preview.site ?? null,
              },
            });
          }),
        );
      }
    }

    // Update collaborators (add/remove)
    if (collaborators) {
      // Get current collaborators
      const current = await prisma.draftCollaborator.findMany({
        where: { draftId },
      });
      const currentIds = current.map((dc) => dc.userId);
      // Add new collaborators
      const toAdd = collaborators.filter(
        (id: string) => !currentIds.includes(id),
      );
      await Promise.all(
        toAdd.map(async (userId: string) => {
          await prisma.draftCollaborator.create({ data: { userId, draftId } });
          await prisma.user.update({
            where: { id: userId },
            data: { hasNewDrafts: true },
          });
          // Send push notification to all devices for this user
          const user = await prisma.user.findUnique({ where: { id: userId } });
          const deviceTokens = await prisma.deviceToken.findMany({
            where: { userId },
          });

          if (!firebaseApp) {
            console.error(
              "[Notification] Firebase not initialized, skipping notifications",
            );
            return;
          }

          await Promise.all(
            deviceTokens.map(async (dt: any) => {
              try {
                const message = {
                  notification: {
                    title: `You've been added as a collaborator!`,
                    body: `You've been added as a collaborator to '${draft.title}' by ${user?.username}`,
                  },
                  data: {
                    type: "draft",
                    draftId,
                  },
                  token: dt.token,
                };

                const response = await admin.messaging().send(message);
                console.log(
                  `[Notification] Successfully sent message:`,
                  response,
                );
              } catch (error) {
                console.error(
                  `[Notification] Error sending notification:`,
                  error,
                );
                // Don't throw here, continue with other notifications
              }
            }),
          );
        }),
      );
      // Remove old collaborators
      const toRemove = currentIds.filter((id) => !collaborators.includes(id));
      await prisma.draftCollaborator.deleteMany({
        where: { draftId, userId: { in: toRemove } },
      });
    }

    // Fetch collaborators info
    const collaboratorsInfo =
      collaborators && collaborators.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: collaborators } },
            select: { id: true, username: true },
          })
        : [];

    // Fetch updated link previews for response
    const savedLinkPreviews = await prisma.draftLinkPreview.findMany({
      where: { draftId },
    });

    return NextResponse.json({
      draft: {
        ...updatedDraft,
        collaboratorsInfo,
        linkPreviews: savedLinkPreviews,
      },
    });
  } catch (error) {
    console.error("❌ Error updating draft:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: "Failed to update draft",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
