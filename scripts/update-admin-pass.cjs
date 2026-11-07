const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes } = require('crypto');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.adminUser.findMany();
  console.log('Existing admin users count:', users.length);
  for (const u of users) {
    console.log(' - User in DB:', u.email, u.role, u.isActive);
  }

  const newHash = hashPassword('kyorix@2026');

  // Ensure admin@kyorix.sports exists and has password kyorix@2026
  const primaryAdmin = await prisma.adminUser.upsert({
    where: { email: 'admin@kyorix.sports' },
    update: {
      passwordHash: newHash,
      isActive: true,
    },
    create: {
      email: 'admin@kyorix.sports',
      fullName: 'System Administrator',
      passwordHash: newHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('Successfully set password for primary admin:', primaryAdmin.email);

  // Also update all other existing admin users just in case
  for (const u of users) {
    if (u.email !== 'admin@kyorix.sports') {
      await prisma.adminUser.update({
        where: { id: u.id },
        data: { passwordHash: newHash },
      });
      console.log('Also updated password for:', u.email);
    }
  }
}

main()
  .catch((e) => {
    console.error('Error updating admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

