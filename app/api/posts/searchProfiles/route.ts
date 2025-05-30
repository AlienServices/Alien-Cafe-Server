import { PrismaClient } from "@prisma/client";
import { log } from "console";
import { NextResponse, NextRequest } from "next/server";

const prisma = new PrismaClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  console.log(username);
  // Handle empty or invalid input
  if (!username || username.trim().length === 0) {
    return NextResponse.json({ users: [] });
  }
  try {
    const users = await prisma.user.findMany({
      where: {
        username: { contains: username.trim(), mode: "insensitive" },
      },
      select: {
        id: true,
        username: true,
        // Add avatar or profile image field if available, e.g. profileImage
        // profileImage: true,
      },
      take: 10,
    });    
    // Add avatar field
    const usersWithAvatar = users.map(user => ({
      ...user,
      avatar: supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/ProfilePhotos/${user.id}.jpg` : undefined,
    }));
    return NextResponse.json({ users: usersWithAvatar });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
