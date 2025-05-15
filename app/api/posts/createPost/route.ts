import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    console.log('Received request to create post')
    const data = await req.json()
    if (!data.categoryIds || !Array.isArray(data.categoryIds) || data.categoryIds.length === 0) {
        return NextResponse.json({ error: 'At least one category ID is required' }, { status: 400 })
    }

    try {
        console.log('Attempting to create post with data:', {
            title: data.title,
            categories: data.categoryIds,
            subCategories: data.subCategories
        })

        const post = await prisma.post.create({
            data: {
                thesis: data.title,
                content: data.content,
                primaryLinks: data.primaryLinks,
                links: data.links,
                tags: data.tags,
                title: data.title,
                email: data.email,
                owner: {
                    connect: { id: data.owner },
                },
                votes: 0,
                likes: [],
                date: data.date,
                yesAction: data.yesAction,
                noAction: data.noAction,
                maybeAction: data.maybeAction,
                probablyNoAction: data.probablyNoAction,
                probablyYesAction: data.probablyYesAction,
                categories: {
                    connect: data.categoryIds.map((id: string) => ({ id }))
                },
                subCategories: data.subCategories || []
            },
            include: {
                categories: true,
                owner: true
            }
        })

        // Create search vector for the new post
        const searchableContent = [
            post.title,
            post.content,
            post.links,
            post.primaryLinks,
            post.thesis,
            post.yesAction,
            post.noAction,
            post.maybeAction,
            post.probablyYesAction,
            post.probablyNoAction,
            post.tags?.join(' '),
            post.categories?.map(cat => cat.name).join(' '),
            post.subCategories?.join(' '),
            post.owner?.username
        ].filter(Boolean).join(' ')

        // Update the post with the search vector
        await prisma.post.update({
            where: { id: post.id },
            data: {
                searchVector: searchableContent
            }
        })

        console.log('Successfully created and indexed post:', post.id)
        return NextResponse.json({ post });

    } catch (error) {
        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Failed to create post', details: error }, { status: 500 })
    }
}   