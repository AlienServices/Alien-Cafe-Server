import { PrismaClient } from '@prisma/client';
import { NextResponse, NextRequest } from 'next/server';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl;    
    const category = searchParams.get('category'); 
    const subcategories = searchParams.get('subCategory'); 

    
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
                        subCategories: 'asc',
                    },
                    {
                        categories: 'asc',
                    },
                ]
                : [
                    {
                        categories: 'asc',
                    },
                ],
        });
        return NextResponse.json({ posts });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: 'An error occurred while fetching posts' }, { status: 500 });
    }
}
