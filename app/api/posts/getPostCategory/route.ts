import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const category = req.nextUrl.searchParams.get('category');
    const subcategories = req.nextUrl.searchParams.get('subCategory'); // Get subcategory parameter


    try {
        const posts = await prisma.post.findMany({
            where: {
                categories: {
                    has: category,
                },
            },
            include: {
                owner: true,
            },
            orderBy: subcategories
                ? [
                    {
                        subCategories: 'asc', // Prioritize subcategories alphabetically if subcategory is passed
                    },
                    {
                        categories: 'asc', // Then prioritize categories alphabetically
                    },
                ]
                : [
                    {
                        date: 'desc', // Default sorting by most recent if no subcategory is passed
                    },
                ],
        });
        return NextResponse.json({ posts });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while fetching posts' }, { status: 500 });
    }
}
