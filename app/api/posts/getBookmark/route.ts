import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get("userId") || undefined;
    try {
        const bookmarks = await prisma.bookmark.findMany({
            where: {
                userId: userId,
            },
        },
        );
        return NextResponse.json({ bookmarks });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "An error occurred" }, { status: 500 });
    }
}
