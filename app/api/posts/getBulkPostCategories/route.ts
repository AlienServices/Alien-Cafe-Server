import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';


export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const categoryIds = searchParams.getAll('categoryIds');
    const limit = parseInt(searchParams.get('limit') || '3', 10);

    if (!categoryIds || categoryIds.length === 0) {
        return NextResponse.json(
            { error: 'Category IDs are required' },
            { status: 400 }
        );
    }

    try {
        console.log(`🚀 Bulk loading posts for ${categoryIds.length} categories`);

        // Use Promise.allSettled to fetch all categories in parallel
        const results = await Promise.allSettled(
            categoryIds.map(async (categoryId) => {
                try {
                    // Get total count for pagination
                    const total = await prisma.post.count({
                        where: {
                            categories: {
                                some: { id: categoryId }
                            }
                        }
                    });

                    // Fetch paginated posts
                    const posts = await prisma.post.findMany({
                        where: {
                            categories: {
                                some: {
                                    id: categoryId
                                }
                            }
                        },
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
                        skip: 0,
                        take: limit,
                    });

                    // Ensure `subCategories` is always an array
                    posts.forEach((post) => {
                        (post as any).subCategories = post.subcategories || [];
                    });

                    return {
                        categoryId,
                        posts,
                        total,
                        hasMore: posts.length < total,
                        success: true
                    };
                } catch (error) {
                    console.error(`Error fetching posts for category ${categoryId}:`, error);
                    return {
                        categoryId,
                        posts: [],
                        total: 0,
                        hasMore: false,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
            })
        );

        // Process results
        const bulkResult: Record<string, any> = {};
        let successCount = 0;
        let errorCount = 0;

        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const { categoryId, ...data } = result.value;
                bulkResult[categoryId] = data;
                if (data.success) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } else {
                errorCount++;
                console.error('Promise rejected:', result.reason);
            }
        });

        console.log(`✅ Bulk loading completed: ${successCount} categories loaded, ${errorCount} failed`);

        return NextResponse.json({
            results: bulkResult,
            summary: {
                total: categoryIds.length,
                success: successCount,
                errors: errorCount
            }
        });

    } catch (error) {
        console.error('Bulk loading error:', error);
        return NextResponse.json(
            { error: 'An error occurred while bulk fetching posts' },
            { status: 500 }
        );
    }
}

