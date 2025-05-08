import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categories = [
  "Aliens",
  "Animals",
  "Climate Change",
  "Crazy Conspiracy Theories",
  "Current Events",
  "Death Afterlife",
  "Drama Romance",
  "Espionage",
  "Finance",
  "Food",
  "Guns",
  "Government",
  "Health",
  "History",
  "Immigration",
  "International",
  "Literature",
  "LGBTQ",
  "Love and Family",
  "The Media",
  "Movies and TV",
  "Mysteries",
  "People",
  "Religion, Spiritualities & Culture",
  "Science",
  "Sci-Fi",
  "Secret Societies",
  "Self Improvement",
  "Sports",
  "Tech",
  "Travel",
  "War",
  "Weapons",
  "Weather",
  "World Organizations"
]

async function seedCategories() {
  try {
    console.log('Starting to seed categories...')

    for (const categoryName of categories) {
      const createdCategory = await prisma.category.upsert({
        where: { name: categoryName },
        update: {
          iconPath: `/icons/${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`,
          isCustomIcon: true
        },
        create: {
          name: categoryName,
          iconPath: `/icons/${categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`,
          isCustomIcon: true
        }
      })
      console.log(`Upserted category: ${categoryName} with ID: ${createdCategory.id}`)
    }

    console.log('Seeding completed successfully!')
  } catch (error) {
    console.error('Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedCategories()
  .catch(console.error) 