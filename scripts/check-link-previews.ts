import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLinkPreviews() {
  try {
    console.log('Checking for posts with link previews...')
    
    // Get all posts with link previews
    const postsWithPreviews = await prisma.post.findMany({
      include: {
        linkPreviews: true
      }
    })
    
    console.log(`Total posts: ${postsWithPreviews.length}`)
    
    const postsWithLinkPreviews = postsWithPreviews.filter(post => post.linkPreviews.length > 0)
    console.log(`Posts with link previews: ${postsWithLinkPreviews.length}`)
    
    if (postsWithLinkPreviews.length > 0) {
      console.log('\nPosts with link previews:')
      postsWithLinkPreviews.forEach(post => {
        console.log(`- Post ID: ${post.id}`)
        console.log(`  Title: ${post.title}`)
        console.log(`  Link previews: ${post.linkPreviews.length}`)
        post.linkPreviews.forEach(preview => {
          console.log(`    - URL: ${preview.url}`)
          console.log(`      Title: ${preview.title}`)
        })
        console.log('')
      })
    } else {
      console.log('No posts with link previews found.')
      
      // Check if there are any posts with URLs in their content
      const postsWithUrls = await prisma.post.findMany({
        where: {
          OR: [
            { content: { contains: 'http' } },
            { links: { contains: 'http' } },
            { primaryLinks: { contains: 'http' } }
          ]
        },
        select: {
          id: true,
          title: true,
          content: true,
          links: true,
          primaryLinks: true
        }
      })
      
      console.log(`\nPosts with URLs in content: ${postsWithUrls.length}`)
      if (postsWithUrls.length > 0) {
        console.log('Sample posts with URLs:')
        postsWithUrls.slice(0, 3).forEach(post => {
          console.log(`- Post ID: ${post.id}`)
          console.log(`  Title: ${post.title}`)
          console.log(`  Content contains URL: ${post.content?.includes('http')}`)
          console.log(`  Links contains URL: ${post.links?.includes('http')}`)
          console.log(`  PrimaryLinks contains URL: ${post.primaryLinks?.includes('http')}`)
          console.log('')
        })
      }
    }
  } catch (error) {
    console.error('Error checking link previews:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLinkPreviews() 