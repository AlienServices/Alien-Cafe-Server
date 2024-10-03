import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const searchTerm = req.nextUrl.searchParams.get("title")?.toLowerCase();  // Getting the search term from query params
  
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: {
        post: {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      },
      include: {
        post: true,  // Including the associated post
      },
    });

    console.log(bookmarks, "this is a list of bookmarks");
    return NextResponse.json({ bookmarks });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
