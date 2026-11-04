/**
 * Foundation Seeding Script
 * Kyorix Sports Technology - Athlete ID Card Generation System
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function seed() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('================================================================');
    console.log('SEEDING INITIAL FOUNDATION DATA (KYORIX ATHLETE ID SYSTEM)');
    console.log('================================================================');

    // 1. Seed Initial Administrator
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@kyorix.sports';
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeMeOnFirstLogin2026!';
    const adminName = process.env.INITIAL_ADMIN_NAME || 'System Administrator';

    console.log(`[1/3] Ensuring Super Admin account (${adminEmail})...`);
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = hashPassword(adminPassword);
      await prisma.adminUser.create({
        data: {
          email: adminEmail,
          passwordHash,
          fullName: adminName,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });
      console.log(`[SUCCESS] Created initial Super Admin: ${adminEmail}`);
    } else {
      console.log(`[INFO] Super Admin already exists: ${adminEmail}`);
    }

    // 2. Seed Academies
    console.log('[2/3] Seeding foundation academies...');
    const academies = [
      {
        code: 'KYX-ACAD-01',
        name: 'Kyorix National High-Performance Academy',
        city: 'New Delhi',
        state: 'Delhi',
        contactPerson: 'Master Rajesh Sharma',
        contactPhone: '+91 9811002233',
        contactEmail: 'rajesh@kyorixsports.com',
      },
      {
        code: 'KYX-ACAD-02',
        name: 'Tigers Taekwondo Combat Club',
        city: 'Chandigarh',
        state: 'Punjab',
        contactPerson: 'Coach Harpreet Singh',
        contactPhone: '+91 9876543210',
        contactEmail: 'harpreet@tigers-tkd.org',
      },
      {
        code: 'KYX-ACAD-03',
        name: 'Lotus Taekwondo Training Centre',
        city: 'Bengaluru',
        state: 'Karnataka',
        contactPerson: 'Master S. Raman',
        contactPhone: '+91 9448123456',
        contactEmail: 'raman@lotustkd.in',
      },
    ];

    for (const acad of academies) {
      await prisma.academy.upsert({
        where: { code: acad.code },
        update: acad,
        create: acad,
      });
    }
    console.log(`[SUCCESS] Ensured ${academies.length} foundation academies.`);

    // 3. Seed Weight Categories
    console.log('[3/3] Seeding Olympic & World Taekwondo standard weight categories...');
    const weightCategories = [
      // Senior Male
      { code: 'SR_M_U54', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Under 54kg (Fin)', maxWeightKg: 54 },
      { code: 'SR_M_U58', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Under 58kg (Fly)', minWeightKg: 54, maxWeightKg: 58 },
      { code: 'SR_M_U63', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Under 63kg (Bantam)', minWeightKg: 58, maxWeightKg: 63 },
      { code: 'SR_M_U68', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Under 68kg (Feather)', minWeightKg: 63, maxWeightKg: 68 },
      { code: 'SR_M_U74', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Under 74kg (Light)', minWeightKg: 68, maxWeightKg: 74 },
      { code: 'SR_M_U80', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Under 80kg (Welter)', minWeightKg: 74, maxWeightKg: 80 },
      { code: 'SR_M_U87', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Under 87kg (Middle)', minWeightKg: 80, maxWeightKg: 87 },
      { code: 'SR_M_O87', division: 'SENIOR', gender: 'MALE', name: 'Senior Male Over 87kg (Heavy)', minWeightKg: 87, maxWeightKg: 999 },
      // Senior Female
      { code: 'SR_F_U46', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Under 46kg (Fin)', maxWeightKg: 46 },
      { code: 'SR_F_U49', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Under 49kg (Fly)', minWeightKg: 46, maxWeightKg: 49 },
      { code: 'SR_F_U53', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Under 53kg (Bantam)', minWeightKg: 49, maxWeightKg: 53 },
      { code: 'SR_F_U57', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Under 57kg (Feather)', minWeightKg: 53, maxWeightKg: 57 },
      { code: 'SR_F_U62', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Under 62kg (Light)', minWeightKg: 57, maxWeightKg: 62 },
      { code: 'SR_F_U67', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Under 67kg (Welter)', minWeightKg: 62, maxWeightKg: 67 },
      { code: 'SR_F_U73', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Under 73kg (Middle)', minWeightKg: 67, maxWeightKg: 73 },
      { code: 'SR_F_O73', division: 'SENIOR', gender: 'FEMALE', name: 'Senior Female Over 73kg (Heavy)', minWeightKg: 73, maxWeightKg: 999 },
    ];

    for (const wc of weightCategories) {
      await prisma.weightCategory.upsert({
        where: { code: wc.code },
        update: wc,
        create: wc,
      });
    }
    console.log(`[SUCCESS] Ensured ${weightCategories.length} standard weight categories.`);

    // 4. Record Initial Audit Log
    await prisma.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        action: 'SYSTEM_BOOTSTRAP_FOUNDATION_INITIALIZED',
        entityType: 'System',
        details: JSON.stringify({
          adminSeeded: adminEmail,
          academiesCount: academies.length,
          weightCategoriesCount: weightCategories.length,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    console.log('================================================================');
    console.log('STATUS: SEEDING COMPLETED SUCCESSFULLY');
    console.log('================================================================');
  } catch (err) {
    console.error('[FATAL SEED ERROR]', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

