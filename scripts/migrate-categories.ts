import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateCategories() {
  try {
    // Get all unique categories from posts
    const posts = await prisma.post.findMany({
      select: {
        id: true,
        categories: true,
        subcategories: true
      }
    })

    console.log(`Found ${posts.length} posts to migrate`)

    // Create a Set of unique categories
    const uniqueCategories = new Set<string>()
    posts.forEach(post => {
      if (Array.isArray(post.categories)) {
        post.categories.forEach(category => uniqueCategories.add(category.name))
      }
    })

    console.log(`Found ${uniqueCategories.size} unique categories`)

    // Create categories in the database
    const categoryMap = new Map<string, string>() // name -> id
    for (const categoryName of Array.from(uniqueCategories)) {
      const category = await prisma.category.create({
        data: {
          name: categoryName,
          iconPath: `/icons/${categoryName.toLowerCase().replace(/\s+/g, '-')}.svg`,
          isCustomIcon: true
        }
      })
      categoryMap.set(categoryName, category.id)
      console.log(`Created category: ${categoryName}`)
    }

    // Update posts to use the new category relations
    for (const post of posts) {
      if (Array.isArray(post.categories)) {
        const categoryIds = post.categories
          .map(cat => categoryMap.get(cat.name))
          .filter((id): id is string => id !== undefined)

        await prisma.post.update({
          where: { id: post.id },
          data: {
            categories: {
              connect: categoryIds.map(id => ({ id }))
            }
          }
        })
        console.log(`Updated post ${post.id} with ${categoryIds.length} categories`)
      }
    }

    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateCategories()
  .catch(console.error) 