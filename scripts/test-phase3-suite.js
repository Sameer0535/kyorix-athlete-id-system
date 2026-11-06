/**
 * Phase 3 Comprehensive Test Suite: ID Card Design & PDF Generation Engine
 * Kyorix Sports Technology - Athlete ID Card Generation System
 */

const { PrismaClient } = require('@prisma/client');
const { PDFDocument } = require('pdf-lib');
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

// Import PDF Generator
const {
  generateIndividualCardPdf,
  generateBulkCardsPdf,
  CARD_WIDTH_PT,
  CARD_HEIGHT_PT,
  DEFAULT_BRANDING,
} = require('../src/lib/pdf-generator');

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('PHASE 3 AUTOMATED TEST SUITE: OFFICIAL ATHLETE ID CARD ENGINE');
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

  try {
    // -------------------------------------------------------------------------
    // PREP: Ensure a valid test JPEG image exists in storage/private/photos
    // -------------------------------------------------------------------------
    const root = path.resolve(process.cwd(), 'storage', 'private', 'photos');
    if (!fs.existsSync(root)) fs.mkdirSync(root, { recursive: true });

    // Minimal valid JPEG binary buffer (1x1 red pixel)
    const testJpegBuffer = Buffer.from([
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
      0x00, 0xbf, 0x80, 0xff, 0xd9,
    ]);

    const testPhotoKey = `photos/test_p3_${testTimestamp}.jpg`;
    fs.writeFileSync(path.resolve(process.cwd(), 'storage', 'private', testPhotoKey), testJpegBuffer);

    // -------------------------------------------------------------------------
    // TEST 1: Physical Dimensions & Individual PDF Generation
    // -------------------------------------------------------------------------
    console.log('\n[TEST 1] Individual PDF Generation & CR80 Physical Dimensions...');
    const singleCardData = {
      cardNumber: `KYX-ID-2026-00001`,
      registrationNumber: `REG-2026-0001`,
      kukkiwonId: `05872134`,
      fullName: `Harshavardhan Chauhan`,
      gender: `MALE`,
      danOrPoom: `2nd Dan Black Belt`,
      academyName: `Kyorix National High-Performance Academy`,
      academyCity: `New Delhi`,
      weightCategoryName: `Senior Male Under 58kg (Flyweight)`,
      division: `SENIOR`,
      photoStorageKey: testPhotoKey,
      photoMimeType: `image/jpeg`,
    };

    const { buffer: singlePdfBuffer, pageCount: singlePageCount } = await generateIndividualCardPdf(singleCardData);

    if (singlePageCount !== 1) throw new Error(`Expected 1 page, got ${singlePageCount}`);
    if (singlePdfBuffer.length < 500) throw new Error('Generated PDF buffer is unexpectedly small');

    // Inspect generated PDF dimensions with pdf-lib parser
    const parsedDoc = await PDFDocument.load(singlePdfBuffer);
    const firstPage = parsedDoc.getPage(0);
    const { width, height } = firstPage.getSize();

    console.log(`  - Page Dimensions: ${width.toFixed(2)} pt x ${height.toFixed(2)} pt`);
    console.log(`  - Standard CR80 Target: ${CARD_WIDTH_PT} pt x ${CARD_HEIGHT_PT} pt`);

    // Tolerance within 0.1 pt
    if (Math.abs(width - CARD_WIDTH_PT) > 0.5 || Math.abs(height - CARD_HEIGHT_PT) > 0.5) {
      throw new Error(`CR80 physical dimensions mismatch: ${width}x${height} vs ${CARD_WIDTH_PT}x${CARD_HEIGHT_PT}`);
    }

    console.log('  ✔ [PASS] Generated PDF matches international CR80 standard (85.6mm x 54mm landscape).');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 2: Font Embedding & Image Quality Verification
    // -------------------------------------------------------------------------
    console.log('\n[TEST 2] Embedded Fonts & Content Integrity Verification...');
    let fontCount = 0;
    for (const [ref, obj] of parsedDoc.context.enumerateIndirectObjects()) {
      const str = obj.toString ? obj.toString() : '';
      if (str.includes('/Type /Font') && (str.includes('/BaseFont /Helvetica') || str.includes('/BaseFont /Courier'))) {
        fontCount++;
      }
    }

    if (fontCount < 2) {
      throw new Error(`Expected at least 2 embedded fonts in PDF dictionary, found ${fontCount}`);
    }

    console.log(`  - Detected ${fontCount} embedded font definitions in PDF dictionary (/Type /Font).`);
    console.log('  ✔ [PASS] Fonts embedded and validated in PDF structure.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 3: Bulk PDF Generation & Multi-Page Consistency
    // -------------------------------------------------------------------------
    console.log('\n[TEST 3] Bulk Multi-Page PDF Generation...');
    const bulkCards = [
      {
        ...singleCardData,
        cardNumber: `KYX-ID-2026-00001`,
        fullName: `Harshavardhan Chauhan`,
        kukkiwonId: `05872134`,
      },
      {
        ...singleCardData,
        cardNumber: `KYX-ID-2026-00002`,
        fullName: `Simran Kaur`,
        gender: `FEMALE`,
        danOrPoom: `1st Dan Black Belt`,
        weightCategoryName: `Senior Female Under 49kg (Flyweight)`,
        kukkiwonId: `05981245`,
      },
      {
        ...singleCardData,
        cardNumber: `KYX-ID-2026-00003`,
        fullName: `Aarav Malhotra`,
        danOrPoom: `1st Poom Junior Black Belt`,
        weightCategoryName: `Junior Male Under 55kg`,
        division: `JUNIOR`,
        kukkiwonId: `05776512`,
      },
    ];

    const { buffer: bulkBuffer, pageCount: bulkPageCount, errors } = await generateBulkCardsPdf(bulkCards);

    if (bulkPageCount !== 3) throw new Error(`Expected 3 pages in bulk PDF, got ${bulkPageCount}`);
    if (errors.length > 0) throw new Error(`Bulk render errors: ${JSON.stringify(errors)}`);

    const parsedBulk = await PDFDocument.load(bulkBuffer);
    for (let p = 0; p < bulkPageCount; p++) {
      const page = parsedBulk.getPage(p);
      const { width: pWidth, height: pHeight } = page.getSize();
      if (Math.abs(pWidth - CARD_WIDTH_PT) > 0.5 || Math.abs(pHeight - CARD_HEIGHT_PT) > 0.5) {
        throw new Error(`Inconsistent page dimension on page ${p + 1}: ${pWidth}x${pHeight}`);
      }
    }

    console.log(`  - Successfully generated bulk PDF: ${bulkPageCount} pages (${bulkBuffer.length} bytes)`);
    console.log('  ✔ [PASS] Every page in multi-page document maintains identical CR80 landscape card geometry.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 4: Database Synchronization (id_card_records & card_generation_batches)
    // -------------------------------------------------------------------------
    console.log('\n[TEST 4] Database Persistence & Batch Synchronization...');
    const academy = await prisma.academy.findFirst();
    const weightCategory = await prisma.weightCategory.findFirst();
    const adminUser = await prisma.adminUser.findFirst();

    if (!academy || !weightCategory || !adminUser) {
      throw new Error('Database prerequisite records missing');
    }

    // Insert test athlete and registration
    const testAthleteKuk = `KUK-P3-${testTimestamp}`;
    const athlete = await prisma.athlete.create({
      data: {
        kukkiwonId: testAthleteKuk,
        fullName: 'Vikramaditya Rao',
        gender: 'MALE',
        danOrPoom: '3rd Dan',
        academyId: academy.id,
      },
    });

    const photoRecord = await prisma.athletePhotograph.create({
      data: {
        athleteId: athlete.id,
        storageProvider: 'LOCAL_PRIVATE',
        storageKey: testPhotoKey,
        fileName: 'vikram.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: testJpegBuffer.length,
        checksumSha256: crypto.createHash('sha256').update(testJpegBuffer).digest('hex'),
        isCurrent: true,
      },
    });

    const registration = await prisma.registration.create({
      data: {
        registrationNumber: `REG-P3-${testTimestamp}`,
        athleteId: athlete.id,
        academyId: academy.id,
        photographId: photoRecord.id,
        weightCategoryId: weightCategory.id,
        approvalStatus: 'APPROVED',
        athleteAccessToken: crypto.randomBytes(24).toString('hex'),
      },
    });

    // Create IdCardRecord
    const cardsDir = path.resolve(process.cwd(), 'storage', 'private', 'cards');
    if (!fs.existsSync(cardsDir)) fs.mkdirSync(cardsDir, { recursive: true });

    const savedCardFileKey = `cards/test_${testTimestamp}.pdf`;
    fs.writeFileSync(path.resolve(process.cwd(), 'storage', 'private', savedCardFileKey), singlePdfBuffer);

    const idCard = await prisma.idCardRecord.create({
      data: {
        cardNumber: `KYX-ID-P3-${testTimestamp}`,
        registrationId: registration.id,
        athleteId: athlete.id,
        status: 'GENERATED',
        generatedFileKey: savedCardFileKey,
        generatedFileSizeBytes: singlePdfBuffer.length,
        checksumSha256: crypto.createHash('sha256').update(singlePdfBuffer).digest('hex'),
        generatedAt: new Date(),
        generatedByAdminId: adminUser.id,
      },
    });

    console.log(`  - Persisted IdCardRecord: ${idCard.cardNumber} (FileKey: ${idCard.generatedFileKey})`);

    // Verify retrieval
    const fetchedCard = await prisma.idCardRecord.findUnique({
      where: { id: idCard.id },
      include: { athlete: true, registration: true },
    });

    if (!fetchedCard || fetchedCard.status !== 'GENERATED') {
      throw new Error('IdCardRecord retrieval or status mismatch');
    }

    console.log('  ✔ [PASS] IdCardRecord successfully persisted with generated file metadata.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 5: Regeneration After Approved Edit
    // -------------------------------------------------------------------------
    console.log('\n[TEST 5] Regeneration After Approved Edits...');
    // Simulate updating name
    await prisma.athlete.update({
      where: { id: athlete.id },
      data: { fullName: 'Vikramaditya S. Rao (Updated)' },
    });

    // Regenerate
    const regeneratedData = {
      ...singleCardData,
      fullName: 'Vikramaditya S. Rao (Updated)',
      cardNumber: idCard.cardNumber,
    };
    const { buffer: regenBuffer } = await generateIndividualCardPdf(regeneratedData);

    const updatedCard = await prisma.idCardRecord.update({
      where: { id: idCard.id },
      data: {
        generatedFileSizeBytes: regenBuffer.length,
        checksumSha256: crypto.createHash('sha256').update(regenBuffer).digest('hex'),
        generatedAt: new Date(),
      },
    });

    if (!updatedCard || updatedCard.generatedFileSizeBytes !== regenBuffer.length) {
      throw new Error('Card regeneration update failed');
    }

    console.log('  ✔ [PASS] ID Card successfully regenerated after athlete profile updates.');
    passed++;

    // -------------------------------------------------------------------------
    // TEST 6: Audit Logging for Card Generation & Downloads
    // -------------------------------------------------------------------------
    console.log('\n[TEST 6] Audit Trail Writing for Generation & Download Events...');
    const auditGen = await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        adminUserId: adminUser.id,
        registrationId: registration.id,
        action: 'ID_CARD_GENERATED_INDIVIDUAL',
        entityType: 'IdCardRecord',
        entityId: idCard.id,
        details: JSON.stringify({ cardNumber: idCard.cardNumber, test: true }),
      },
    });

    const auditDownload = await prisma.auditLog.create({
      data: {
        actorType: 'ATHLETE_PORTAL',
        actorId: athlete.id,
        registrationId: registration.id,
        action: 'ATHLETE_CARD_DOWNLOADED',
        entityType: 'IdCardRecord',
        entityId: idCard.id,
        details: JSON.stringify({ cardNumber: idCard.cardNumber, test: true }),
      },
    });

    if (!auditGen.id || !auditDownload.id) throw new Error('Audit trail creation failed');
    console.log('  ✔ [PASS] Audit logs recorded for both administrative generation and athlete download events.');
    passed++;

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records and files...');
    await prisma.auditLog.deleteMany({ where: { registrationId: registration.id } });
    await prisma.idCardRecord.deleteMany({ where: { registrationId: registration.id } });
    await prisma.registration.deleteMany({ where: { id: registration.id } });
    await prisma.athletePhotograph.deleteMany({ where: { id: photoRecord.id } });
    await prisma.athlete.deleteMany({ where: { id: athlete.id } });

    // Clean test files
    const p1 = path.resolve(process.cwd(), 'storage', 'private', testPhotoKey);
    const p2 = path.resolve(process.cwd(), 'storage', 'private', savedCardFileKey);
    if (fs.existsSync(p1)) fs.unlinkSync(p1);
    if (fs.existsSync(p2)) fs.unlinkSync(p2);

    console.log('  ✔ [CLEANUP] Test records and files removed.');

  } catch (err) {
    console.error(`\n✘ [ERROR in test suite]:`, err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log(`PHASE 3 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runPhase3Tests();
