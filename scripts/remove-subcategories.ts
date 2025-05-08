const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function removeSubcategories() {
  try {
    console.log('Starting to remove all subcategories...')

    const result = await prisma.subcategory.deleteMany({})
    
    console.log(`Removed ${result.count} subcategories`)
    console.log('Removal completed successfully!')
  } catch (error) {
    console.error('Removal failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

removeSubcategories()
  .catch(console.error) 