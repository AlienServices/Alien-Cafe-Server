import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search")?.toLowerCase();  
  try {
    const user = await prisma.post.findMany({
      where: {
        title: { contains: search, mode: "insensitive" },
      },
      include: {
        comments: {
          include: {
            replies: true,
          },
        }        
      },
    });
    console.log(user, "this is a user with comments");
    return NextResponse.json({ user });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
