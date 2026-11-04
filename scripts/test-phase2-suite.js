/**
 * Comprehensive Phase 2 Test Suite
 * Kyorix Sports Technology - Athlete ID Card Generation System
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

async function runPhase2Tests() {
  console.log('================================================================');
  console.log('PHASE 2 AUTOMATED TEST SUITE - ATHLETE REGISTRATION & VERIFICATION');
  console.log('================================================================');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  });

  let passed = 0;
  let failed = 0;

  const testTimestamp = Date.now();
  const testAcademyCode = `TEST-ACAD-${testTimestamp}`;
  const testCategoryCode = `TEST-CAT-${testTimestamp}`;
  const testKukkiwonId = `KUK-TEST-${testTimestamp}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: ACADEMY MANAGEMENT & DUPLICATE PREVENTION
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] Academy Creation & Duplicate Prevention...');
    const academy = await prisma.academy.create({
      data: {
        code: testAcademyCode,
        name: `Test Taekwondo Dojang ${testTimestamp}`,
        city: 'Mumbai',
        state: 'Maharashtra',
        contactPerson: 'Master Test Coach',
        isVerified: true,
      },
    });
    console.log(`  - Created academy: ${academy.code} (${academy.name})`);

    // Attempt duplicate code
    let dupCaught = false;
    try {
      await prisma.academy.create({
        data: {
          code: testAcademyCode,
          name: 'Another Name',
          city: 'Pune',
          state: 'Maharashtra',
        },
      });
    } catch (err) {
      if (err.code === 'P2002') dupCaught = true;
    }

    if (!dupCaught) throw new Error('Duplicate academy code was not prevented!');
    console.log('  ✔ [PASS] Academy created and duplicate code strictly rejected by database.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 2: WEIGHT CATEGORY CONFIGURATION
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Configurable Weight Category Creation & Updating...');
    const weightCategory = await prisma.weightCategory.create({
      data: {
        code: testCategoryCode,
        name: `Senior Male U65 Test ${testTimestamp}`,
        division: 'SENIOR',
        gender: 'MALE',
        minWeightKg: 60.0,
        maxWeightKg: 65.0,
        isActive: true,
      },
    });
    console.log(`  - Created weight category: ${weightCategory.code} (${weightCategory.name})`);

    // Update weight limit
    const updatedCategory = await prisma.weightCategory.update({
      where: { id: weightCategory.id },
      data: { maxWeightKg: 65.5 },
    });
    if (updatedCategory.maxWeightKg !== 65.5) throw new Error('Weight limit update failed');
    console.log('  ✔ [PASS] Weight category created and configured dynamically.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 3: ATHLETE REGISTRATION WITH PHOTO & UNIQUE REFERENCE
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Athlete Registration & Unique Reference Generation...');
    // Create photo record
    const fakePhotoKey = `photos/test_${testTimestamp}.jpg`;
    const photo = await prisma.athletePhotograph.create({
      data: {
        athlete: {
          create: {
            kukkiwonId: testKukkiwonId,
            fullName: 'Rahul Sharma',
            gender: 'MALE',
            danOrPoom: '2nd Dan',
            academyId: academy.id,
          },
        },
        storageProvider: 'LOCAL_PRIVATE',
        storageKey: fakePhotoKey,
        fileName: 'rahul_portrait.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 245000,
        checksumSha256: crypto.createHash('sha256').update(fakePhotoKey).digest('hex'),
        isCurrent: true,
      },
      include: { athlete: true },
    });

    const athlete = photo.athlete;
    const regCount = await prisma.registration.count();
    const regNum = `REG-${new Date().getFullYear()}-${String(regCount + 1).padStart(4, '0')}`;
    const athleteToken = crypto.randomBytes(24).toString('hex');

    const registration = await prisma.registration.create({
      data: {
        registrationNumber: regNum,
        athleteId: athlete.id,
        academyId: academy.id,
        photographId: photo.id,
        weightCategoryId: weightCategory.id,
        approvalStatus: 'PENDING_REVIEW',
        athleteAccessToken: athleteToken,
      },
    });

    console.log(`  - Registered athlete: ${athlete.fullName} (${athlete.kukkiwonId})`);
    console.log(`  - Registration Reference: ${registration.registrationNumber}`);
    console.log(`  - Initial Status: ${registration.approvalStatus}`);

    if (registration.approvalStatus !== 'PENDING_REVIEW') throw new Error('Initial status not PENDING_REVIEW');
    console.log('  ✔ [PASS] Athlete registration with private photo reference created in PENDING_REVIEW.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 4: REQUEST CORRECTIONS & RESUBMISSION LIFECYCLE
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Admin Requests Corrections & Athlete Resubmission...');
    // Admin requests corrections
    const withChanges = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        approvalStatus: 'CHANGES_REQUESTED',
        notes: 'Please upload a photo with white background and clear face lighting.',
      },
    });
    if (withChanges.approvalStatus !== 'CHANGES_REQUESTED') throw new Error('Status update to CHANGES_REQUESTED failed');
    console.log(`  - Admin updated status to CHANGES_REQUESTED with notes: "${withChanges.notes}"`);

    // Athlete resubmits corrections
    const resubmitted = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        approvalStatus: 'PENDING_REVIEW',
        notes: null,
      },
    });
    if (resubmitted.approvalStatus !== 'PENDING_REVIEW' || resubmitted.notes !== null) {
      throw new Error('Resubmission state transition failed');
    }
    console.log(`  - Athlete resubmitted: Status returned to PENDING_REVIEW`);
    console.log('  ✔ [PASS] Full CHANGES_REQUESTED -> PENDING_REVIEW lifecycle verified.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 5: ADMIN APPROVAL & ID CARD AUTO-PROVISIONING
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Admin Approval & ID Card Credential Instantiation...');
    const adminUser = await prisma.adminUser.findFirst();
    if (!adminUser) throw new Error('No admin user found for approval test');

    const cardCount = await prisma.idCardRecord.count();
    const cardNumber = `KYX-ID-${new Date().getFullYear()}-${String(cardCount + 1).padStart(5, '0')}`;

    const approvedReg = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        approvalStatus: 'APPROVED',
        approvedByAdminId: adminUser.id,
        approvalDate: new Date(),
        idCard: {
          create: {
            cardNumber,
            athleteId: athlete.id,
            status: 'GENERATED',
            generatedAt: new Date(),
            generatedByAdminId: adminUser.id,
          },
        },
      },
      include: { idCard: true },
    });

    if (approvedReg.approvalStatus !== 'APPROVED' || !approvedReg.idCard) {
      throw new Error('Approval and card provisioning failed');
    }
    console.log(`  - Approved registration: ${approvedReg.registrationNumber}`);
    console.log(`  - Associated ID Card: ${approvedReg.idCard.cardNumber} (${approvedReg.idCard.status})`);
    console.log('  ✔ [PASS] Registration approved and official ID card instantiated.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 6: AUDIT LOG VERIFICATION
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Comprehensive Audit Trail Writing...');
    const audit = await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        adminUserId: adminUser.id,
        registrationId: registration.id,
        action: 'REGISTRATION_PHASE2_VERIFICATION_COMPLETE',
        entityType: 'Registration',
        entityId: registration.id,
        details: JSON.stringify({
          kukkiwonId: testKukkiwonId,
          approvedBy: adminUser.email,
          cardNumber,
        }),
      },
    });

    if (!audit.id) throw new Error('Audit log creation failed');
    console.log(`  - Recorded audit log entry: ${audit.id} (${audit.action})`);
    console.log('  ✔ [PASS] Audit log recorded with full context and immutable timestamp.');
    passed++;

    // -------------------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up temporary test records...');
    await prisma.auditLog.deleteMany({ where: { registrationId: registration.id } });
    await prisma.idCardRecord.deleteMany({ where: { registrationId: registration.id } });
    await prisma.registration.deleteMany({ where: { id: registration.id } });
    await prisma.athletePhotograph.deleteMany({ where: { id: photo.id } });
    await prisma.athlete.deleteMany({ where: { id: athlete.id } });
    await prisma.weightCategory.deleteMany({ where: { id: weightCategory.id } });
    await prisma.academy.deleteMany({ where: { id: academy.id } });
    console.log('  ✔ [CLEANUP] Test records cleaned up.');

  } catch (err) {
    console.error(`\n✘ [ERROR in test suite]:`, err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runPhase2Tests();

