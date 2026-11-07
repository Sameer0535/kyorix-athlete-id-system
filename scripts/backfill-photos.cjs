const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const photos = await prisma.athletePhotograph.findMany();
  console.log('Total photos in DB:', photos.length);

  for (const ph of photos) {
    if (!ph.photoBase64) {
      // Check local storage paths
      const possiblePaths = [
        path.resolve(process.cwd(), 'storage/private', ph.storageKey),
        path.resolve('/tmp/storage/private', ph.storageKey),
      ];

      let foundBuffer = null;
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          foundBuffer = fs.readFileSync(p);
          break;
        }
      }

      if (foundBuffer) {
        await prisma.athletePhotograph.update({
          where: { id: ph.id },
          data: { photoBase64: foundBuffer.toString('base64') },
        });
        console.log(`Backfilled photoBase64 for photo ${ph.id}`);
      } else {
        console.log(`Could not find local file for photo ${ph.id} (${ph.storageKey})`);
      }
    } else {
      console.log(`Photo ${ph.id} already has photoBase64`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

