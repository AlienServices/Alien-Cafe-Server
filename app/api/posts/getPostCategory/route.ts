import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;
    const category = searchParams.get('category');
    const subcategories = searchParams.getAll('subCategory'); // Handle multiple subcategories


    try {
        // Fetch all posts in the specified category
        const posts = await prisma.post.findMany({
            where: {
                categories: {
                    has: category, // Filter by category
                },
            },
            include: {
                owner: true,
                comments: true,
                bookmarks: true
            },
        });

        // Ensure `subCategories` is always an array
        posts.forEach((post) => {
            post.subCategories = post.subCategories || [];
        });

        if (subcategories.length > 0) {
            posts.sort((a, b) => {
                const aMatches = a.subCategories.filter(subCat => subcategories.includes(subCat)).length;
                const bMatches = b.subCategories.filter(subCat => subcategories.includes(subCat)).length;

                // ✅ Ensure posts with matching subcategories come first
                if (aMatches !== bMatches) {
                    return bMatches - aMatches; // Higher match count first
                }

                // ✅ Within matching posts, sort by alphabetical order of subcategories
                const aSortedSubCat = a.subCategories.slice().sort().join(', ');
                const bSortedSubCat = b.subCategories.slice().sort().join(', ');

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
