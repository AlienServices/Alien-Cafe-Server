import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  console.log("Creating draft");
  try {
    const data = await req.json();
    console.log(data);
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