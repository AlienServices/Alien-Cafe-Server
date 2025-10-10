import { prisma } from '../lib/prisma'


async function createSearchIndexes() {
  try {
    console.log('Starting to create search indexes...')
    
    // Get all posts
    const posts = await prisma.post.findMany({
      include: {
        categories: true,
        owner: true
      }
    })

    console.log(`Found ${posts.length} posts to index`)

    // Create search vector for each post
    for (const post of posts) {
      const searchableContent = [
        post.title,
        post.content,
        post.thesis,
        post.links,
        post.primaryLinks,
        post.yesAction,
        post.noAction,
        post.maybeAction,
        post.probablyYesAction,
        post.probablyNoAction,
        post.tags?.join(' '),
        post.categories?.map(cat => cat.name).join(' '),
        post.categories?.flatMap(cat => (cat as any).subcategories || []).join(' '),
        post.owner?.username
      ].filter(Boolean).join(' ')

      // Use raw query to update the search vector
      await prisma.$executeRaw`
        UPDATE "posts"
        SET "searchVector" = ${searchableContent}
        WHERE id = ${post.id}
      `

      console.log(`Indexed post: ${post.id}`)
    }

    console.log('Indexing completed successfully!')
  } catch (error) {
    console.error('Indexing failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createSearchIndexes() 
