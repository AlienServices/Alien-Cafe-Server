import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const searchTerm = req.nextUrl.searchParams.get("search")?.toLowerCase();
  const userId = req.nextUrl.searchParams.get("userId") || undefined;
  console.log(searchTerm, 'this is the search term')
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: userId,
        post: {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
      include: {
        post: true, 
      },
    });
    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
