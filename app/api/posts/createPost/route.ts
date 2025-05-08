import { PrismaClient } from '@prisma/client'
import { log } from 'console'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    const data = await req.json()
    console.log('Received data:', JSON.stringify(data, null, 2))
    console.log(data.categoryId)
    if (!data.categoryId) {
        return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    try {
        console.log('Attempting to create post with data:', {
            title: data.title,
            category: data.categoryId,
            subCategories: data.subCategories
        })

        const test = await prisma.post.create({
            data: {
                thesis: data.title,
                content: data.content,
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
                    connect: [{ id: data.categoryId }]
                },
                subCategories: data.subCategories || []
            }
        })
        console.log('Successfully created post:', test)
        return NextResponse.json({ hello: test });

    } catch (error) {
        console.error('Error creating post:', error)
        return NextResponse.json({ error: 'Failed to create post', details: error }, { status: 500 })
    }
}   