/**
 * Dedicated Concurrent Multi-Batch Stress Test
 * Kyorix Sports Technology - Athlete ID Card Generation Platform
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const { executeBulkExport } = require('../src/lib/export/bulk-exporter.ts');
const { hashAthleteAccessCode } = require('../src/lib/auth.ts');

const prisma = new PrismaClient();

async function runConcurrencyTest() {
  console.log('================================================================');
  console.log('KYORIX ATHLETE ID - CONCURRENT MULTI-BATCH STRESS TEST');
  console.log('================================================================');

  const storageDir = path.resolve(process.cwd(), 'storage', 'private');
  const photosDir = path.resolve(storageDir, 'photos');
  const batchesDir = path.resolve(storageDir, 'batches');
  [photosDir, batchesDir].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  const runId = Date.now();
  const runHex = crypto.randomBytes(4).toString('hex');

  // Pre-cleanup leftover test records
  try {
    await prisma.idCardRecord.deleteMany({
      where: { registration: { registrationNumber: { startsWith: 'REG-CONC-' } } },
    });
    await prisma.registration.deleteMany({
      where: { registrationNumber: { startsWith: 'REG-CONC-' } },
    });
    await prisma.athlete.deleteMany({
      where: {
        OR: [
          { kukkiwonId: { startsWith: 'CONC_' } },
          { kukkiwonId: { startsWith: 'K_' } },
        ],
      },
    });
    await prisma.cardGenerationBatch.deleteMany({
      where: { batchNumber: { startsWith: 'BATCH-STRESS-' } },
    });
  } catch (cleanErr) {
    // Ignore cleanup errors
  }

  // Verify foundation
  const academy = await prisma.academy.findFirst();
  const weightCat = await prisma.weightCategory.findFirst();
  const admin = await prisma.adminUser.findFirst({ where: { role: 'SUPER_ADMIN' } });

  // Minimal valid 1x1 JPEG
  const photoBuf = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
    0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9,
  ]);
  const masterPhotoKey = `photos/conc_test_master_${runId}.jpg`;
  fs.writeFileSync(path.resolve(storageDir, masterPhotoKey), photoBuf);

  const masterAthlete = await prisma.athlete.create({
    data: {
      kukkiwonId: `CONC_MST_${runHex}`,
      fullName: 'Master Concurrency Athlete',
      gender: 'MALE',
      academyId: academy.id,
    },
  });

  const masterPhoto = await prisma.athletePhotograph.create({
    data: {
      athleteId: masterAthlete.id,
      storageKey: masterPhotoKey,
      fileName: 'conc_master.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: photoBuf.length,
      checksumSha256: crypto.createHash('sha256').update(photoBuf).digest('hex'),
      isCurrent: true,
    },
  });

  async function seedBatchAthletes(count, prefix) {
    const athleteRecords = [];
    const regRecords = [];
    const scaleAthleteIds = [];
    const scaleRegIds = [];

    for (let i = 1; i <= count; i++) {
      const paddedNum = String(i).padStart(6, '0');
      const athleteId = `ath_${prefix}_${paddedNum}_${runId}_${runHex}`;
      const regId = `reg_${prefix}_${paddedNum}_${runId}_${runHex}`;
      const kId = `K_${runHex}_${prefix}${paddedNum}`;

      athleteRecords.push({
        id: athleteId,
        kukkiwonId: kId,
        fullName: `Concurrency Athlete ${prefix}-${i}`,
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        danOrPoom: '1st Dan',
        academyId: academy.id,
      });

      const plainCode = crypto.randomBytes(16).toString('hex');
      regRecords.push({
        id: regId,
        registrationNumber: `REG-CONC-${runHex}-${prefix}-${paddedNum}`,
        athleteId: athleteId,
        academyId: academy.id,
        photographId: masterPhoto.id,
        weightCategoryId: weightCat.id,
        approvalStatus: 'APPROVED',
        approvedByAdminId: admin.id,
        approvalDate: new Date(),
        athleteAccessTokenHash: hashAthleteAccessCode(plainCode),
      });

      scaleAthleteIds.push(athleteId);
      scaleRegIds.push(regId);
    }

    const CHUNK_SIZE = 100;
    for (let c = 0; c < athleteRecords.length; c += CHUNK_SIZE) {
      await prisma.athlete.createMany({ data: athleteRecords.slice(c, c + CHUNK_SIZE) });
    }
    for (let c = 0; c < regRecords.length; c += CHUNK_SIZE) {
      await prisma.registration.createMany({ data: regRecords.slice(c, c + CHUNK_SIZE) });
    }

    return { regIds: scaleRegIds, athleteIds: scaleAthleteIds };
  }

  try {
    console.log('Seeding 2 parallel batches of 50 athletes each...');
    const { regIds: concRegs1, athleteIds: concAth1 } = await seedBatchAthletes(50, 'P1_');
    const { regIds: concRegs2, athleteIds: concAth2 } = await seedBatchAthletes(50, 'P2_');

    const batchC1 = await prisma.cardGenerationBatch.create({
      data: {
        batchNumber: `BATCH-STRESS-1-${runId}`,
        initiatedByAdminId: admin.id,
        status: 'QUEUED',
        totalCards: 50,
      },
    });
    const batchC2 = await prisma.cardGenerationBatch.create({
      data: {
        batchNumber: `BATCH-STRESS-2-${runId}`,
        initiatedByAdminId: admin.id,
        status: 'QUEUED',
        totalCards: 50,
      },
    });

    console.log('Launching 2 batches concurrently via Promise.all...');
    const concStart = Date.now();
    const [resC1, resC2] = await Promise.all([
      executeBulkExport(batchC1.id, concRegs1),
      executeBulkExport(batchC2.id, concRegs2),
    ]);
    const concDuration = Date.now() - concStart;

    console.log('\n----------------------------------------------------------------');
    console.log(`  Total Concurrency Time: ${concDuration} ms (${(concDuration / 1000).toFixed(2)} s)`);
    console.log(`  Batch 1: ${resC1.successful} / 50 cards completed (Failed: ${resC1.failed})`);
    console.log(`  Batch 2: ${resC2.successful} / 50 cards completed (Failed: ${resC2.failed})`);
    console.log(`  Combined Throughput:    ${(100 / (concDuration / 1000)).toFixed(1)} cards/second`);
    console.log('----------------------------------------------------------------');

    if (resC1.successful === 50 && resC2.successful === 50 && resC1.failed === 0 && resC2.failed === 0) {
      console.log('✔ [PASS] Concurrency stress test passed: ZERO deadlocks, 100% completion rate!');
    } else {
      throw new Error(`Concurrency test failed: Batch 1 (${resC1.successful}/50), Batch 2 (${resC2.successful}/50)`);
    }

    // Clean files
    [resC1.pdfStorageKey, resC1.zipStorageKey, resC2.pdfStorageKey, resC2.zipStorageKey].forEach((key) => {
      if (key) {
        const p = path.resolve(storageDir, key);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    });

    // Clean DB
    const allConcRegs = [...concRegs1, ...concRegs2];
    const allConcAths = [...concAth1, ...concAth2, masterAthlete.id];
    await prisma.idCardRecord.deleteMany({ where: { registrationId: { in: allConcRegs } } });
    await prisma.registration.deleteMany({ where: { id: { in: allConcRegs } } });
    await prisma.athletePhotograph.deleteMany({ where: { athleteId: { in: allConcAths } } });
    for (let c = 0; c < allConcAths.length; c += 100) {
      await prisma.athlete.deleteMany({ where: { id: { in: allConcAths.slice(c, c + 100) } } });
    }
    await prisma.cardGenerationBatch.deleteMany({ where: { id: { in: [batchC1.id, batchC2.id] } } });
    const p = path.resolve(storageDir, masterPhotoKey);
    if (fs.existsSync(p)) fs.unlinkSync(p);

    console.log('✔ [CLEANUP] Cleaned test files and database records.');
  } catch (err) {
    console.error('CONCURRENCY TEST ERROR:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runConcurrencyTest();
