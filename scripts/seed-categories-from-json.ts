import { prisma } from '../lib/prisma'
import * as fs from 'fs'
import * as path from 'path'


// Function to sanitize names for database and icon paths
function sanitizeName(name: string): { dbName: string; iconPath: string } {
  // For database: truncate to 255 chars and remove problematic characters
  const dbName = name
    .substring(0, 255)
    .replace(/[^\w\s\-&]/g, '') // Remove special chars except spaces, hyphens, and ampersands
    .trim()

  // For icon path: convert to lowercase, replace spaces/special chars with hyphens
  const iconPath = `/${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100)}.svg`

  return { dbName, iconPath }
}

// Function to read and parse the categories.json file
function loadCategoriesFromJson(): any[] {
  try {
    const filePath = path.join(process.cwd(), 'categories.json')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error reading categories.json:', error)
    throw error
  }
}

async function seedCategoriesFromJson() {
  try {
    console.log('Starting to seed categories and subcategories from categories.json...')
    
    const categoriesData = loadCategoriesFromJson()
    let categoriesCreated = 0
    let categoriesUpdated = 0
    let subcategoriesCreated = 0
    let subcategoriesSkipped = 0
    let errors = 0

    for (const categoryObj of categoriesData) {
      const categoryName = Object.keys(categoryObj)[0]
      const subcategories = categoryObj[categoryName]

      if (!categoryName || typeof categoryName !== 'string') {
        console.warn('Skipping invalid category name:', categoryName)
        continue
      }

      const { dbName, iconPath } = sanitizeName(categoryName)
      
      if (!dbName) {
        console.warn('Skipping category with empty sanitized name:', categoryName)
        continue
      }

      try {
        // Upsert the category
        const category = await prisma.category.upsert({
          where: { name: dbName },
          update: {
            iconPath,
            isCustomIcon: true,
            updatedAt: new Date()
          },
          create: {
            name: dbName,
            iconPath,
            isCustomIcon: true
          }
        })

        if (category.createdAt.getTime() === category.updatedAt.getTime()) {
          categoriesCreated++
          console.log(`✅ Created category: ${dbName} (ID: ${category.id})`)
        } else {
          categoriesUpdated++
          console.log(`🔄 Updated category: ${dbName} (ID: ${category.id})`)
        }

        // Handle subcategories
        if (Array.isArray(subcategories) && subcategories.length > 0) {
          for (const subName of subcategories) {
            if (!subName || typeof subName !== 'string' || subName.trim() === '') {
              continue
            }

            const { dbName: subDbName } = sanitizeName(subName)
            
            if (!subDbName) {
              console.warn(`Skipping subcategory with empty sanitized name: ${subName} in category ${dbName}`)
              continue
            }

            try {
              // Check if subcategory already exists for this category
              const existingSub = await prisma.subcategory.findFirst({
                where: {
                  name: subDbName,
                  categoryId: category.id
                }
              })

              if (existingSub) {
                subcategoriesSkipped++
                console.log(`⏭️  Subcategory already exists: ${subDbName} in ${dbName}`)
              } else {
                await prisma.subcategory.create({
                  data: {
                    name: subDbName,
                    categoryId: category.id
                  }
                })
                subcategoriesCreated++
                console.log(`✅ Created subcategory: ${subDbName} in ${dbName}`)
              }
            } catch (subError) {
              console.error(`❌ Error creating subcategory ${subDbName} in ${dbName}:`, subError)
              errors++
            }
          }
        } else {
          console.log(`ℹ️  No subcategories for category: ${dbName}`)
        }

      } catch (categoryError) {
        console.error(`❌ Error processing category ${dbName}:`, categoryError)
        errors++
      }
    }

    // Summary
    console.log('\n📊 Seeding Summary:')
    console.log(`Categories created: ${categoriesCreated}`)
    console.log(`Categories updated: ${categoriesUpdated}`)
    console.log(`Subcategories created: ${subcategoriesCreated}`)
    console.log(`Subcategories skipped (already exist): ${subcategoriesSkipped}`)
    console.log(`Errors encountered: ${errors}`)
    
    if (errors === 0) {
      console.log('🎉 Seeding completed successfully!')
    } else {
      console.log(`⚠️  Seeding completed with ${errors} errors`)
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedCategoriesFromJson()
  .catch(console.error) 
