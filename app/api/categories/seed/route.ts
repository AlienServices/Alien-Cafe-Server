import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

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

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here if needed
    // const { searchParams } = new URL(request.url)
    // const token = searchParams.get('token')
    
    console.log('Starting to seed categories and subcategories from categories.json...')
    
    const categoriesData = loadCategoriesFromJson()
    let categoriesCreated = 0
    let categoriesUpdated = 0
    let subcategoriesCreated = 0
    let subcategoriesSkipped = 0
    let errors = 0
    const errorDetails: string[] = []

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
              const errorMsg = `Error creating subcategory ${subDbName} in ${dbName}: ${subError}`
              console.error(`❌ ${errorMsg}`)
              errorDetails.push(errorMsg)
              errors++
            }
          }
        } else {
          console.log(`ℹ️  No subcategories for category: ${dbName}`)
        }

      } catch (categoryError) {
        const errorMsg = `Error processing category ${dbName}: ${categoryError}`
        console.error(`❌ ${errorMsg}`)
        errorDetails.push(errorMsg)
        errors++
      }
    }

    // Summary
    const summary = {
      categoriesCreated,
      categoriesUpdated,
      subcategoriesCreated,
      subcategoriesSkipped,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    }

    console.log('\n📊 Seeding Summary:', summary)
    
    if (errors === 0) {
      console.log('🎉 Seeding completed successfully!')
      return NextResponse.json({
        success: true,
        message: 'Categories and subcategories seeded successfully',
        summary
      })
    } else {
      console.log(`⚠️  Seeding completed with ${errors} errors`)
      return NextResponse.json({
        success: true,
        message: `Seeding completed with ${errors} errors`,
        summary
      }, { status: 207 }) // 207 Multi-Status
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Seeding failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// Optional: Add GET method to check seeding status
export async function GET() {
  try {
    const categoryCount = await prisma.category.count()
    const subcategoryCount = await prisma.subcategory.count()
    
    return NextResponse.json({
      success: true,
      data: {
        totalCategories: categoryCount,
        totalSubcategories: subcategoryCount
      }
    })
  } catch (error) {
    console.error('Error getting seeding status:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to get seeding status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 