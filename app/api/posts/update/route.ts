import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

type UpdatePostPayload = {
  id?: string;
  userId?: string;
  title?: string;
  thesis?: string;
  content?: string;
  contentMarkdown?: string;
  contentHtml?: string;
  contentText?: string;
  yesAction?: string;
  noAction?: string;
  maybeAction?: string;
  probablyYesAction?: string;
  probablyNoAction?: string;
  links?: string;
  primaryLinks?: string;
  tags?: string[];
  date?: string;
  categoryIds?: string[];
  subCategoryIds?: string[];
  collaborators?: string[];
};

async function handleUpdatePost(req: NextRequest) {
  try {
    const data = (await req.json()) as UpdatePostPayload;
    const { id, userId } = data;

    console.log("Updating post with ID:", id, "for user:", userId);

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Post ID and userId are required" },
        { status: 400 },
      );
    }

    const existingPost = await prisma.post.findFirst({
      where: { id, userId },
      include: { owner: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found or unauthorized" },
        { status: 404 },
      );
    }

    const updateData: any = {
      title: data.title,
      thesis: data.thesis,
      content: data.content,
      contentMarkdown: data.contentMarkdown,
      contentHtml: data.contentHtml,
      contentText: data.contentText,
      yesAction: data.yesAction,
      noAction: data.noAction,
      maybeAction: data.maybeAction,
      probablyYesAction: data.probablyYesAction,
      probablyNoAction: data.probablyNoAction,
      links: data.links,
      primaryLinks: data.primaryLinks,
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      collaborators: Array.isArray(data.collaborators)
        ? data.collaborators
        : undefined,
      date: data.date ? new Date(data.date) : undefined,
    };

    if (Array.isArray(data.categoryIds)) {
      updateData.categories = {
        set: data.categoryIds.map((categoryId) => ({ id: categoryId })),
      };
    }

    if (Array.isArray(data.subCategoryIds)) {
      updateData.subcategories = {
        set: data.subCategoryIds.map((subcategoryId) => ({
          id: subcategoryId,
        })),
      };
    }

    const hasUpdatableFields = Object.values(updateData).some(
      (value) => value !== undefined,
    );
    if (!hasUpdatableFields) {
      return NextResponse.json(
        { error: "No updatable fields provided" },
        { status: 400 },
      );
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        categories: true,
        subcategories: true,
        owner: true,
        media: true,
        linkPreviews: true,
      },
    });

    const searchVector = [
      updatedPost.title,
      updatedPost.content,
      updatedPost.contentText,
      updatedPost.links,
      updatedPost.primaryLinks,
      updatedPost.thesis,
      updatedPost.yesAction,
      updatedPost.noAction,
      updatedPost.maybeAction,
      updatedPost.probablyYesAction,
      updatedPost.probablyNoAction,
      updatedPost.tags?.join(" "),
      updatedPost.categories.map((category) => category.name).join(" "),
      updatedPost.subcategories
        .map((subcategory) => subcategory.name)
        .join(" "),
      updatedPost.owner?.username,
    ]
      .filter(Boolean)
      .join(" ");

    const postWithSearchVector = await prisma.post.update({
      where: { id },
      data: { searchVector },
      include: {
        categories: true,
        subcategories: true,
        owner: true,
        media: true,
        linkPreviews: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Post updated successfully",
      post: postWithSearchVector,
    });
  } catch (error) {
    console.error("Error updating post:", error);

    return NextResponse.json(
      {
        error: "Failed to update post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  console.log("Handling POST request for update");
  return handleUpdatePost(req);
}

export async function PUT(req: NextRequest) {
  console.log("Handling PUT request for update");
  return handleUpdatePost(req);
}
