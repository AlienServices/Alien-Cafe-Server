import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const data = await req.json();
  console.log(data, "this is the data");

  try {
    // Check if the bookmark already exists
    const existingBookmark = await prisma.bookmark.findFirst({
      where: {
        postId: data.postId,
        userId: data.userId,
      },
    });

    if (existingBookmark) {
      // If the bookmark exists, delete it (remove from bookmarks)
      await prisma.bookmark.delete({
        where: {
          id: existingBookmark.id, // Remove the bookmark by its ID
        },
      });
      return NextResponse.json({ message: 'Bookmark removed' });
    } else {
      // If the bookmark doesn't exist, create a new one
      const newBookmark = await prisma.bookmark.create({
        data: {
          postId: data.postId,
          userId: data.userId,
        },
      });

      return NextResponse.json(newBookmark);
    }
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 });
  }
}
