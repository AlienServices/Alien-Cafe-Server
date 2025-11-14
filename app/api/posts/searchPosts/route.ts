import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from "next/server";
import { calculateAverageVoteScore } from '@/app/utils/voteUtils';


export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search")?.toLowerCase();
  const categoriesParam = req.nextUrl.searchParams.get("category"); // Get categories from query params

  // Split categories string into an array (assuming they are passed as a comma-separated string)
  const categories = categoriesParam ? categoriesParam.split(",") : [];

  try {
    const posts = await prisma.post.findMany({
      where: {
        title: {
          contains: search,
          mode: "insensitive",
        },
        // Check if categories are provided; if not, search all categories
        ...(categories.length > 0 && {
          categories: {
            some: {
              name: {
                in: categories
              }
            }
          },
        }),
      },
      include: {
        comments: {
          include: {
            replies: true,
          },
        },
        linkPreviews: true,
        media: {
          orderBy: {
            order: 'asc'
          }
        }
        },
    });
    
    // Calculate average vote scores for all posts
    const postIds = posts.map(p => p.id);
    const allVotes = postIds.length > 0 ? await prisma.vote.findMany({
        where: {
            postId: { in: postIds }
        },
        select: {
            postId: true,
            vote: true,
            createdAt: true
        }
    }) : [];
    
    // Group votes by postId
    const votesByPostId: Record<string, Array<{ vote: string; createdAt: Date | null }>> = {};
    allVotes.forEach(vote => {
        if (!votesByPostId[vote.postId]) {
            votesByPostId[vote.postId] = [];
        }
        votesByPostId[vote.postId].push({
            vote: vote.vote,
            createdAt: vote.createdAt
        });
    });
    
    // Update posts with calculated averages
    const postsWithAverages = posts.map(post => ({
        ...post,
        votes: votesByPostId[post.id] 
            ? calculateAverageVoteScore(votesByPostId[post.id]) 
            : post.votes
    }));
    
    return NextResponse.json({ posts: postsWithAverages });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
