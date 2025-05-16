import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST(req: Request) {
    const data = await req.json()
    console.log(data)

    if (!data.categoryIds || !Array.isArray(data.categoryIds) || data.categoryIds.length === 0) {
        console.log('Validation failed: Missing or invalid category IDs')
        return NextResponse.json({ error: 'At least one category ID is required' }, { status: 400 })
    }

    try {
        console.log('Post data:', {
            title: data.title,
            categories: data.categoryIds,
            subCategories: data.subCategories,
            contentLength: data.content?.length,
            linksCount: data.links?.length,
            primaryLinksCount: data.primaryLinks?.length,
            tagsCount: data.tags?.length
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
                subcategories: data.subCategoryIds && Array.isArray(data.subCategoryIds)
                    ? { connect: data.subCategoryIds.map((id: string) => ({ id })) }
                    : undefined
            },
            include: {
                categories: true,
                owner: true,
                subcategories: true
            }
        })

        console.log('=== POST CREATED SUCCESSFULLY ===')
        console.log('Post ID:', post.id)
        console.log('Connected categories:', Array.isArray(post.categories) ? post.categories.map((c: any) => c.name) : [])
        console.log('Connected subcategories:', Array.isArray(post.subcategories) ? post.subcategories.map((s: any) => s.name) : [])
        console.log('Owner:', post.owner?.username)

        console.log('=== CREATING SEARCH VECTOR ===')
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
            Array.isArray(post.categories) ? post.categories.map((cat: any) => cat.name).join(' ') : '',
            Array.isArray(post.subcategories) ? post.subcategories.map((subcat: any) => subcat.name).join(' ') : '',
            post.owner?.username
        ].filter(Boolean).join(' ')

        console.log('Search vector length:', searchableContent.length)
        console.log('Search vector preview:', searchableContent.substring(0, 100) + '...')

        console.log('=== UPDATING POST WITH SEARCH VECTOR ===')
        const updatedPost = await prisma.post.update({
            where: { id: post.id },
            data: {
                searchVector: searchableContent
            },
            include: {
                categories: true,
                owner: true,
                subcategories: true
            }
        })

        console.log('=== POST CREATION COMPLETED ===')
        console.log('Final post ID:', updatedPost.id)
        return NextResponse.json({ post: updatedPost });

    } catch (error: any) {
        console.error('=== POST CREATION FAILED ===')
        console.error('Error details:', {
            name: error?.name,
            message: error?.message,
            stack: error?.stack
        })
        return NextResponse.json({ error: 'Failed to create post', details: error }, { status: 500 })
    }
}   