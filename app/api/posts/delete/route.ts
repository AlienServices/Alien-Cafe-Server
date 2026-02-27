import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from "next/server";

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let id = searchParams.get("id") ?? undefined;
    let userId = searchParams.get("userId") ?? undefined;

    if (!id || !userId) {
      try {
        const body = await req.json();
        id = id ?? body?.id;
        userId = userId ?? body?.userId;
      } catch {
        // No JSON body provided; query params may still contain values.
      }
    }

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Post ID and userId are required" },
        { status: 400 },
      );
    }

    const existingPost = await prisma.post.findFirst({
      where: { id, userId },
      include: {
        media: true,
        linkPreviews: true,
      },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found or unauthorized" },
        { status: 404 },
      );
    }

    const supabase = getSupabase();

    if (supabase && existingPost.media.length > 0) {
      const pathsToDelete = existingPost.media.flatMap((media) =>
        media.thumbnailPath
          ? [media.storagePath, media.thumbnailPath]
          : [media.storagePath],
      );

      const { error: storageDeleteError } = await supabase.storage
        .from("postmedia")
        .remove(pathsToDelete);

      if (storageDeleteError) {
        console.error(
          "Failed to delete one or more media files from storage:",
          storageDeleteError.message,
        );
      }
    }

    const deletedPost = await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
      deletedPostId: deletedPost.id,
    });
  } catch (error) {
    console.error("Error deleting post:", error);

    return NextResponse.json(
      {
        error: "Failed to delete post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
