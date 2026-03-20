import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      {
        error: "Email parameter is required",
        receivedParams: req.nextUrl.searchParams.toString(),
      },
      { status: 400 },
    );
  }

  if (email.trim() === "") {
    return NextResponse.json(
      {
        error: "Email parameter cannot be empty",
        receivedParams: req.nextUrl.searchParams.toString(),
      },
      { status: 400 },
    );
  }

  // Additional validation for email format
  if (!email.includes("@")) {
    return NextResponse.json(
      {
        error: "Invalid email format",
        receivedEmail: email,
      },
      { status: 400 },
    );
  }

  try {
    const userWithCount = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!userWithCount) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { _count, ...user } = userWithCount;
    const postCount = _count?.posts ?? 0;

    return NextResponse.json({ user, postCount });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
