import { prisma } from '@/lib/prisma'
import { NextResponse, NextRequest } from 'next/server';


export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const categoryId = searchParams.get('categoryId');
    const subcategories = searchParams.getAll('subCategory'); // Handle multiple subcategories
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    console.log(categoryId)

    if (!categoryId) {
        return NextResponse.json(
            { error: 'Category ID is required' },
            { status: 400 }
        );
    }

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
        const skip = (page - 1) * limit;
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
            (post as any).subCategories = post.categories.flatMap(cat => cat.subcategories || []);
        });

        if (subcategories.length > 0) {
            posts.sort((a, b) => {
                const aMatches = (a as any).subCategories.filter((subCat: any) => subcategories.includes(subCat)).length;
                const bMatches = (b as any).subCategories.filter((subCat: any) => subcategories.includes(subCat)).length;

                // ✅ Ensure posts with matching subcategories come first
                if (aMatches !== bMatches) {
                    return bMatches - aMatches; // Higher match count first
                }

                // ✅ Within matching posts, sort by alphabetical order of subcategories
                const aSortedSubCat = (a as any).subCategories.slice().sort().join(', ');
                const bSortedSubCat = (b as any).subCategories.slice().sort().join(', ');

                return aSortedSubCat.localeCompare(bSortedSubCat);
            });
        }        
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
