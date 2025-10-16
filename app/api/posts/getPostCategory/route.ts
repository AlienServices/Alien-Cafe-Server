import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';


export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const categoryId = searchParams.get('categoryId');
    const subCategoryId = searchParams.get('subCategoryId'); // Single subcategory filter
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    console.log(categoryId, subCategoryId)

    if (!categoryId) {
        return NextResponse.json(
            { error: 'Category ID is required' },
            { status: 400 }
        );
    }

    try {
        // Build where clause for posts
        const whereClause: any = {
            categories: {
                some: {
                    id: categoryId
                }
            }
        };

        // Add subcategory filtering if specified
        if (subCategoryId) {
            whereClause.subcategories = {
                some: {
                    id: subCategoryId
                }
            };
        }

        // Get total count for pagination
        const total = await prisma.post.count({
            where: whereClause
        });

        // Fetch paginated posts
        const skip = (page - 1) * limit;
        const posts = await prisma.post.findMany({
            where: whereClause,
            include: {
                owner: true,
                comments: true,
                bookmarks: true,
                categories: {
                    include: {
                        subcategories: true
                    }
                },
                subcategories: true,
                linkPreviews: true,
                media: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            },
            orderBy: { date: 'desc' },
            skip,
            take: limit,
        });

        // Ensure `subCategories` is always an array
        console.log(posts)
        posts.forEach((post) => {
            (post as any).subCategories = post.subcategories || [];
        });        
        return NextResponse.json({
            posts,
            page,
            limit,
            total,
            hasMore: skip + posts.length < total,
        });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: 'An error occurred while fetching posts' },
            { status: 500 }
        );
    }
}

