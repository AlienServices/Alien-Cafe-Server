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
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token is required" },
        { status: 401 },
      );
    }
    const token = authHeader.substring(7);

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase configuration error" },
        { status: 500 },
      );
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Invalid or expired authorization token" },
        { status: 401 },
      );
    }

    // Look up the user in the database using their email from Supabase
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    let id = searchParams.get("id") ?? undefined;
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }
    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 },
      );
    }

    console.log("id", id);

    const existingPost = await prisma.post.findFirst({
      where: { id, userId: dbUser.id },
      include: {
        media: true, // get media, etc. because we want to delete that.
        linkPreviews: true,
      },
    });
    console.log("** currentUserId: ", dbUser.id);
    console.log("** existingPost", existingPost);
    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found or unauthorized" },
        { status: 404 },
      );
    }

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
