import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const categoryId = searchParams.get('categoryId');
    const subcategories = searchParams.getAll('subCategory'); // Handle multiple subcategories
    console.log(categoryId)

    if (!categoryId) {
        return NextResponse.json(
            { error: 'Category ID is required' },
            { status: 400 }
        );
    }

    try {
        // Fetch all posts in the specified category
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
                }
            },
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
        return NextResponse.json({ posts });
    } catch (error) {
        console.log(error);
        return NextResponse.json(
            { error: 'An error occurred while fetching posts' },
            { status: 500 }
        );
    }
}
