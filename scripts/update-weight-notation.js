const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function formatWeightName(name) {
  if (!name) return name;
  return name
    .replace(/\bUnder\s+(\d+)\s*kg/gi, (m, p) => `U ${p}kg`)
    .replace(/\bOver\s+(\d+)\s*kg/gi, (m, p) => `O ${p}kg`)
    .replace(/\s+-(\d+)\s*kg/gi, (m, p) => ` U ${p}kg`)
    .replace(/\s+\+(\d+)\s*kg/gi, (m, p) => ` O ${p}kg`);
}

async function run() {
  console.log("Fetching weight categories to convert 'Under 54kg' -> 'U 54kg'...");
  const categories = await prisma.weightCategory.findMany();
  let updatedCount = 0;

  for (const cat of categories) {
    const formatted = formatWeightName(cat.name);
    if (formatted !== cat.name) {
      await prisma.weightCategory.update({
        where: { id: cat.id },
        data: { name: formatted },
      });
      updatedCount++;
    }
  }

  console.log(`Successfully updated ${updatedCount} weight categories to 'U Xkg' / 'O Xkg' format.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error updating weight notation:", err);
    process.exit(1);
  });
