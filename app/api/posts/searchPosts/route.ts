import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from "next/server";


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
    
    return NextResponse.json({ posts });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
