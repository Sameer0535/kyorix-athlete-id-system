const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const virtualTkdCategories = [
  // 1. Individual Freshers (Color Belts)
  { code: "VT-IND-FR-CHILD", name: "Virtual Taekwondo - Individual Freshers (Children)", division: "SUB_CADET" },
  { code: "VT-IND-FR-SUBJUN", name: "Virtual Taekwondo - Individual Freshers (Sub Junior)", division: "SUB_CADET" },
  { code: "VT-IND-FR-CADET", name: "Virtual Taekwondo - Individual Freshers (Cadet)", division: "CADET" },
  { code: "VT-IND-FR-JUNIOR", name: "Virtual Taekwondo - Individual Freshers (Junior)", division: "JUNIOR" },
  { code: "VT-IND-FR-SENIOR", name: "Virtual Taekwondo - Individual Freshers (Senior)", division: "SENIOR" },

  // 2. Individual Regular (Black Belt / Poom Holders)
  { code: "VT-IND-REG-CHILD", name: "Virtual Taekwondo - Individual Regular (Children)", division: "SUB_CADET" },
  { code: "VT-IND-REG-SUBJUN", name: "Virtual Taekwondo - Individual Regular (Sub Junior)", division: "SUB_CADET" },
  { code: "VT-IND-REG-CADET", name: "Virtual Taekwondo - Individual Regular (Cadet)", division: "CADET" },
  { code: "VT-IND-REG-JUNIOR", name: "Virtual Taekwondo - Individual Regular (Junior)", division: "JUNIOR" },
  { code: "VT-IND-REG-SENIOR", name: "Virtual Taekwondo - Individual Regular (Senior)", division: "SENIOR" },

  // 3. Mix Gender Individual Freshers (Color Belts)
  { code: "VT-MIX-FR-CHILD", name: "Virtual Taekwondo - Mix Gender Individual Freshers (Children)", division: "SUB_CADET" },
  { code: "VT-MIX-FR-SUBJUN", name: "Virtual Taekwondo - Mix Gender Individual Freshers (Sub Junior)", division: "SUB_CADET" },
  { code: "VT-MIX-FR-CADET", name: "Virtual Taekwondo - Mix Gender Individual Freshers (Cadet)", division: "CADET" },
  { code: "VT-MIX-FR-JUNIOR", name: "Virtual Taekwondo - Mix Gender Individual Freshers (Junior)", division: "JUNIOR" },
  { code: "VT-MIX-FR-SENIOR", name: "Virtual Taekwondo - Mix Gender Individual Freshers (Senior)", division: "SENIOR" },

  // 4. Mix Gender Individual Regular (Black Belt / Poom Holders)
  { code: "VT-MIX-REG-CHILD", name: "Virtual Taekwondo - Mix Gender Individual Regular (Children)", division: "SUB_CADET" },
  { code: "VT-MIX-REG-SUBJUN", name: "Virtual Taekwondo - Mix Gender Individual Regular (Sub Junior)", division: "SUB_CADET" },
  { code: "VT-MIX-REG-CADET", name: "Virtual Taekwondo - Mix Gender Individual Regular (Cadet)", division: "CADET" },
  { code: "VT-MIX-REG-JUNIOR", name: "Virtual Taekwondo - Mix Gender Individual Regular (Junior)", division: "JUNIOR" },
  { code: "VT-MIX-REG-SENIOR", name: "Virtual Taekwondo - Mix Gender Individual Regular (Senior)", division: "SENIOR" }
];

async function seedVirtualTkd() {
  console.log(`Starting to upsert ${virtualTkdCategories.length} Virtual Taekwondo categories...`);
  let count = 0;

  for (const cat of virtualTkdCategories) {
    await prisma.weightCategory.upsert({
      where: { code: cat.code },
      update: {
        name: cat.name,
        division: cat.division,
        gender: "MALE", // Open to all genders in application logic
        minWeightKg: null,
        maxWeightKg: 0,
        isActive: true,
      },
      create: {
        code: cat.code,
        name: cat.name,
        division: cat.division,
        gender: "MALE", // Open to all genders in application logic
        minWeightKg: null,
        maxWeightKg: 0,
        isActive: true,
      },
    });
    count++;
  }

  console.log(`Successfully upserted ${count} Virtual Taekwondo categories into database.`);
}

seedVirtualTkd()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error upserting Virtual Taekwondo categories:", err);
    process.exit(1);
  });

