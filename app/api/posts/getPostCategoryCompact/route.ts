import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";
import { calculateAverageVoteScore } from "@/app/utils/voteUtils";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const categoryId = searchParams.get("categoryId");
  const subCategoryId = searchParams.get("subCategoryId");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "3", 10);

  if (!categoryId) {
    return NextResponse.json(
      { error: "Category ID is required" },
      { status: 400 },
    );
  }

  try {
    const whereClause: any = {
      categories: {
        some: {
          id: categoryId,
        },
      },
    };

    if (subCategoryId) {
      whereClause.subcategories = {
        some: {
          id: subCategoryId,
        },
      };
    }

    const skip = (page - 1) * limit;
    const postsBasic = await prisma.post.findMany({
      where: whereClause,
      select: {
        id: true,
        date: true,
      },
    });

    const total = postsBasic.length;

    const postIds = postsBasic.map((p) => p.id);
    const allVotes = postIds.length
      ? await prisma.vote.findMany({
          where: {
            postId: { in: postIds },
          },
          select: {
            postId: true,
            vote: true,
            createdAt: true,
          },
        })
      : [];

    const votesByPostId: Record<
      string,
      Array<{ vote: string; createdAt: Date | null }>
    > = {};
    allVotes.forEach((vote) => {
      if (!votesByPostId[vote.postId]) {
        votesByPostId[vote.postId] = [];
      }
      votesByPostId[vote.postId].push({
        vote: vote.vote,
        createdAt: vote.createdAt,
      });
    });

    const sortedPostIds = postsBasic
      .map((post) => ({
        id: post.id,
        date: post.date,
        score:
          calculateAverageVoteScore(votesByPostId[post.id]) ??
          Number.NEGATIVE_INFINITY,
      }))
      .sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : 0;
        const bDate = b.date ? new Date(b.date).getTime() : 0;
        return bDate - aDate;
      })
      .map((post) => post.id);

    const pagedPostIds = sortedPostIds.slice(skip, skip + limit);

    const posts = pagedPostIds.length
      ? await prisma.post.findMany({
          where: {
            id: { in: pagedPostIds },
          },
          select: {
            id: true,
            title: true,
            date: true,
            userId: true,
            email: true,
            categories: true,
            subcategories: true,
            media: {
              select: {
                storagePath: true,
                thumbnailPath: true,
                isVideo: true,
              },
              orderBy: {
                order: "asc",
              },
              take: 1,
            },
          },
        })
      : [];

    const orderMap = new Map(pagedPostIds.map((id, index) => [id, index]));
    posts.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

    const postsWithMedia = posts.map((post) => {
      const mediaItem = post.media?.[0];
      if (mediaItem) {
        const path = mediaItem.isVideo
          ? mediaItem.storagePath
          : mediaItem.thumbnailPath || mediaItem.storagePath;

        return {
          ...post,
          media: [
            {
              isVideo: mediaItem.isVideo,
              thumbnailPath: path,
            },
          ],
        };
      }
      return post;
    });

    return NextResponse.json({
      posts: postsWithMedia,
      page,
      limit,
      total,
      hasMore: skip + posts.length < total,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "An error occurred while fetching posts" },
      { status: 500 },
    );
  }
}
