import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'
import { extractUrls } from '../../../../utils/urlUtils'

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
            tagsCount: data.tags?.length,
            linkPreviewsCount: data.linkPreviews?.length || 0,
            mediaFilesCount: data.mediaFiles?.length || 0
        })

        const post = await prisma.post.create({
            data: {
                thesis: data.thesis ?? data.title,
                content: data.content,
                primaryLinks: data.primaryLinks,
                links: data.links,
                tags: data.tags,
                title: data.title,
                email: data.email,
                userId: data.owner,
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
                    : undefined,
                // Create link previews if provided
                linkPreviews: data.linkPreviews && Array.isArray(data.linkPreviews)
                    ? {
                        create: data.linkPreviews.map((preview: any) => ({
                            url: preview.url,
                            title: preview.title,
                            description: preview.description,
                            imageUrl: preview.imageUrl,
                            domain: preview.domain,
                            faviconUrl: preview.faviconUrl
                        }))
                    }
                    : undefined
            },
            include: {
                categories: true,
                owner: true,
                subcategories: true,
                linkPreviews: true
            }
        })

        console.log('=== POST CREATED SUCCESSFULLY ===')
        console.log('Post ID:', post.id)
        console.log('Connected categories:', Array.isArray(post.categories) ? post.categories.map((c: any) => c.name) : [])
        console.log('Connected subcategories:', Array.isArray(post.subcategories) ? post.subcategories.map((s: any) => s.name) : [])
        console.log('Owner:', post.owner?.username)
        console.log('Link previews created:', post.linkPreviews?.length || 0)

        // Media files are now handled by the frontend via uploadPostMedia
        // No need to create database records here as they will be created during upload
        if (data.mediaFiles && Array.isArray(data.mediaFiles) && data.mediaFiles.length > 0) {
            console.log('=== MEDIA FILES DETECTED ===')
            console.log('Media files count:', data.mediaFiles.length)
            console.log('Media files will be handled by frontend uploadPostMedia function')
            console.log('=== MEDIA FILES HANDLING SKIPPED ===')
        }

        // Extract URLs from content and generate link previews
        console.log('=== EXTRACTING URLs AND GENERATING LINK PREVIEWS ===')
        const allContent = [
            post.content,
            post.links,
            post.primaryLinks
        ].filter(Boolean).join(' ');
        
        const urls = extractUrls(allContent);
        console.log('Found URLs:', urls);

        // Generate link previews for each URL (this will be handled by the frontend)
        // The frontend will call the fetchLinkPreview endpoint for each URL

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
                subcategories: true,
                linkPreviews: true
            }
        })

        console.log('=== POST CREATION COMPLETED ===')
        console.log('Final post ID:', updatedPost.id)
        return NextResponse.json({ 
            post: updatedPost,
            urls: urls // Return URLs for frontend to generate previews
        });

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