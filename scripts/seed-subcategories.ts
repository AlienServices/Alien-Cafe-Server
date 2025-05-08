const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const subcategories = {
  "Aliens": ["Aliens", "Crop Circles", "UFOs", "UFO Sightings"],
  "Animals": ["Insects", "Microbiology"],
  "Business": ["Corporations", "Small Businesses", "Entrepreneurship"],
  "Climate Change": ["Proof of Climate Change", "Climate Change Hoax"],
  "Espionage": ["The Kennedy Assasinations", "The Titanic"],
  "Finance": ["Banks and Credit Unions", "Foreign Banks"],
  "Food": ["Toxins"],
  "Government": [
    "Deep State",
    "Executive",
    "Legislature",
    "Judicial System",
    "Bureaucracy"
  ],
  "Health": ["Vaccines", "Self Help"],
  "History": ["Wars", "The Holocaust", "Ancient Civilizations"],
  "Hobby": ["Crafts", "Musings", "How Things Work"],
  "Horror": ["Real Crime", "Disappearances"],
  "Immigration": ["US Immigration", "European Immigration"],
  "International": [
    "CCP",
    "Russia",
    "Israel",
    "Ukraine",
    "Europe",
    "Africa",
    "Australia",
    "Asia"
  ],
  "Love and Family": ["Love", "Marriage", "Relationships"],
  "The Media": ["News"],
  "People": ["Jeffrey Epstein", "Bill Gates", "The Clintons"],
  "Religion, Spiritualities & Culture": [
    "Christianity",
    "Islam",
    "Non-religious",
    "Hinduism",
    "Buddhism"
  ],
  "Science": [
    "Time Travel",
    "Alternate History",
    "Dystopian Societies",
    "Magic Realism"
  ],
  "Secret Societies": [
    "Illuminati",
    "Skull And Bones",
    "The Bilderberg Group",
    "The Club Of Rome"
  ],
  "Tech": ["Artificial Intelligence"],
  "War": ["Ukraine", "Israel"],
  "Weather": ["North Carolina", "Lahaina"],
  "World Organizations": ["WHO", "Club Of Rome", "UN"]
}

async function seedSubcategories() {
  try {
    console.log('Starting to seed subcategories...')

    for (const [categoryName, subcategoryList] of Object.entries(subcategories)) {
      // Find the category
      const category = await prisma.category.findUnique({
        where: { name: categoryName }
      })

      if (!category) {
        console.log(`Category not found: ${categoryName}`)
        continue
      }

      // Create subcategories for this category
      for (const subName of subcategoryList) {
        const subcategory = await prisma.subcategory.create({
          data: {
            name: subName,
            categoryId: category.id
          }
        })
        console.log(`Created subcategory: ${subName} for category: ${categoryName}`)
      }
    }

    console.log('Seeding completed successfully!')
  } catch (error) {
    console.error('Seeding failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedSubcategories()
  .catch(console.error) 