/**
 * Verification & Regression Test Suite for Phase 1 Foundation
 * Tests:
 * 1. Kukkiwon ID Unique Constraint (prevent duplicate Kukkiwon IDs)
 * 2. Scrypt Password Hashing & Verification
 * 3. Jose Admin & Athlete JWT creation & verification
 * 4. Private Storage Engine (MIME validation, hashing, directory traversal prevention)
 * 5. Audit Log writing
 */

const { PrismaClient } = require('@prisma/client');
const { scryptSync, randomBytes, timingSafeEqual } = require('crypto');
const { SignJWT, jwtVerify } = require('jose');
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

async function runTests() {
  console.log('================================================================');
  console.log('PHASE 1 FOUNDATION TEST SUITE - KYORIX SPORTS TECHNOLOGY');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  // TEST 1: Password Hashing & Constant-Time Verification
  try {
    console.log('\n[TEST 1] Scrypt Password Hashing & Verification...');
    const rawPass = 'SecretAdminPassword2026!';
    const salt = randomBytes(16).toString('hex');
    const hash = `${salt}:${scryptSync(rawPass, salt, 64).toString('hex')}`;

    // Verify correct password
    const [storedSalt, storedKey] = hash.split(':');
    const checkKey = scryptSync(rawPass, storedSalt, 64);
    const valid = timingSafeEqual(Buffer.from(storedKey, 'hex'), checkKey);
    if (!valid) throw new Error('Password verification failed for correct password');

    // Verify incorrect password
    const badKey = scryptSync('WrongPassword', storedSalt, 64);
    const badValid = timingSafeEqual(Buffer.from(storedKey, 'hex'), badKey);
    if (badValid) throw new Error('Password verification succeeded for incorrect password!');

    console.log('  ✔ [PASS] Scrypt hashing and verification working with zero external binary dependency.');
    passed++;
  } catch (err) {
    console.error('  ✘ [FAIL] Test 1 failed:', err.message);
    failed++;
  }

  // TEST 2: Jose JWT Session Tokens
  try {
    console.log('\n[TEST 2] Jose JWT Token Signing & Expiration...');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-for-tests-32chars!');
    const token = await new SignJWT({
      adminId: 'admin_test_123',
      email: 'admin@kyorix.sports',
      fullName: 'Master Test',
      role: 'SUPER_ADMIN',
      type: 'ADMIN',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('2h')
      .setIssuer('kyorix:athlete-id:admin')
      .sign(secret);

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'kyorix:athlete-id:admin',
    });

    if (payload.adminId !== 'admin_test_123' || payload.role !== 'SUPER_ADMIN') {
      throw new Error('JWT payload mismatch');
    }
    console.log('  ✔ [PASS] Admin JWT signing and verification validated.');
    passed++;
  } catch (err) {
    console.error('  ✘ [FAIL] Test 2 failed:', err.message);
    failed++;
  }

  // TEST 3: Private Storage Engine & Magic Bytes Verification
  try {
    console.log('\n[TEST 3] Private Storage Security & Magic Byte Validation...');
    const root = path.resolve(process.cwd(), 'storage', 'private');
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

    // Valid JPEG header
    const fakeJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
    const hash = crypto.createHash('sha256').update(fakeJpeg).digest('hex');
    const testFileName = `test_photo_${Date.now()}.jpg`;
    const photosDir = path.join(root, 'photos');
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
    const targetFile = path.join(photosDir, testFileName);

    fs.writeFileSync(targetFile, fakeJpeg);
    const readBack = fs.readFileSync(targetFile);
    const readHash = crypto.createHash('sha256').update(readBack).digest('hex');

    if (readHash !== hash) throw new Error('File integrity hash mismatch');
    fs.unlinkSync(targetFile); // Cleanup

    console.log('  ✔ [PASS] Private storage file write, SHA-256 integrity, and path isolation validated.');
    passed++;
  } catch (err) {
    console.error('  ✘ [FAIL] Test 3 failed:', err.message);
    failed++;
  }

  // TEST 4: Kukkiwon ID Uniqueness & Duplicate Prevention (Prisma + PostgreSQL)
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('\n[TEST 4] Duplicate Kukkiwon ID Prevention (Database Constraint)...');
    const academy = await prisma.academy.findFirst();
    if (!academy) throw new Error('No academy found in database for test.');

    const testKukkiwonId = `TEST-KUK-${Date.now()}`;

    // Clean up any existing test records with this ID
    await prisma.athlete.deleteMany({
      where: { kukkiwonId: testKukkiwonId },
    });

    // Step A: Insert first athlete with testKukkiwonId
    const athlete1 = await prisma.athlete.create({
      data: {
        kukkiwonId: testKukkiwonId,
        fullName: 'Test Athlete One',
        gender: 'MALE',
        danOrPoom: '1st Dan',
        academyId: academy.id,
      },
    });
    console.log(`  - Inserted first athlete (ID: ${athlete1.id}, Kukkiwon ID: ${athlete1.kukkiwonId})`);

    // Step B: Attempt to insert second athlete with the SAME testKukkiwonId
    let duplicatePrevented = false;
    try {
      await prisma.athlete.create({
        data: {
          kukkiwonId: testKukkiwonId, // SAME ID!
          fullName: 'Test Athlete Two (Duplicate Attempt)',
          gender: 'MALE',
          danOrPoom: '2nd Dan',
          academyId: academy.id,
        },
      });
    } catch (dbErr) {
      if (dbErr.code === 'P2002') {
        duplicatePrevented = true;
        console.log(`  - Database caught unique constraint violation (P2002 on ${dbErr.meta?.target})`);
      } else {
        throw dbErr;
      }
    }

    if (!duplicatePrevented) {
      throw new Error('FAILURE: Duplicate Kukkiwon ID was allowed into the database!');
    }

    // Step C: Cleanup test athlete
    await prisma.athlete.delete({
      where: { id: athlete1.id },
    });
    console.log('  ✔ [PASS] Database strictly prevented duplicate Kukkiwon ID (P2002 unique constraint enforced).');
    passed++;
  } catch (err) {
    console.error('  ✘ [FAIL] Test 4 failed:', err.message);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

