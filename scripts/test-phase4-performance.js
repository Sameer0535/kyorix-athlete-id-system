/**
 * Phase 4 Performance & Scalability Benchmark Suite
 * Kyorix Sports Technology - Athlete ID Card Generation System
 *
 * Tests batch scales: 10, 100, 500, and 1,000 athletes
 * Measures: Generation duration, Memory consumption, CPU usage, Throughput, Storage footprint, and Failure rate.
 */

const { PDFDocument } = require('pdf-lib');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Minimal valid sample JPEG buffer
const sampleJpeg = Buffer.from([
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

// Import card drawer from generator
const { drawAthleteCard, CARD_WIDTH_PT, CARD_HEIGHT_PT } = require('../src/lib/pdf-generator.ts');

const testOutputDir = path.resolve(process.cwd(), 'storage', 'private', 'perf_bench');

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function benchmarkScale(scale) {
  console.log(`\n----------------------------------------------------------------`);
  console.log(`BENCHMARK TEST: ${scale} ATHLETES`);
  console.log(`----------------------------------------------------------------`);

  if (global.gc) global.gc();

  const memBefore = process.memoryUsage();
  const cpuBefore = process.cpuUsage();
  const startTime = Date.now();

  let successful = 0;
  let failed = 0;

  const combinedDoc = await PDFDocument.create();
  const zip = new JSZip();

  // Create temporary mock photo on disk
  const samplePhotoPath = path.resolve(testOutputDir, `sample_${scale}.jpg`);
  fs.writeFileSync(samplePhotoPath, sampleJpeg);

  for (let i = 1; i <= scale; i++) {
    try {
      const paddedId = String(i).padStart(8, '0');
      const cardData = {
        cardNumber: `KYX-ID-PERF-${paddedId}`,
        registrationNumber: `REG-PERF-${paddedId}`,
        kukkiwonId: paddedId,
        fullName: `Performance Athlete ${i}`,
        gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
        danOrPoom: `${(i % 5) + 1}th Dan`,
        academyName: `Performance Academy ${String.fromCharCode(65 + (i % 8))}`,
        academyCity: 'New Delhi',
        weightCategoryName: 'Senior Male Under 68kg',
        division: 'SENIOR',
        photoStorageKey: `perf_bench/sample_${scale}.jpg`,
        photoMimeType: 'image/jpeg',
        issueDate: new Date(),
      };

      // Add card page to combined document
      const page = combinedDoc.addPage([CARD_WIDTH_PT, CARD_HEIGHT_PT]);
      await drawAthleteCard(combinedDoc, page, cardData);

      // Create individual card buffer for ZIP
      const singleDoc = await PDFDocument.create();
      const singlePage = singleDoc.addPage([CARD_WIDTH_PT, CARD_HEIGHT_PT]);
      await drawAthleteCard(singleDoc, singlePage, cardData);
      const singleBytes = await singleDoc.save();

      zip.file(`Academy_${String.fromCharCode(65 + (i % 8))}/KYX-ID-${paddedId}.pdf`, singleBytes);

      successful++;
    } catch (err) {
      failed++;
    }
  }

  // Finalize combined PDF
  const combinedBytes = await combinedDoc.save();
  const combinedPdfPath = path.resolve(testOutputDir, `batch_${scale}_combined.pdf`);
  fs.writeFileSync(combinedPdfPath, combinedBytes);

  // Finalize ZIP archive
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 4 },
  });
  const zipPath = path.resolve(testOutputDir, `batch_${scale}_archive.zip`);
  fs.writeFileSync(zipPath, zipBuffer);

  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSec = (durationMs / 1000).toFixed(2);
  const throughput = (scale / (durationMs / 1000)).toFixed(1);

  const memAfter = process.memoryUsage();
  const cpuAfter = process.cpuUsage(cpuBefore);

  const heapDiff = memAfter.heapUsed - memBefore.heapUsed;
  const rssDiff = memAfter.rss - memBefore.rss;

  const pdfSize = combinedBytes.length;
  const zipSize = zipBuffer.length;
  const totalStorage = pdfSize + zipSize;

  console.log(`  - Duration:             ${durationMs} ms (${durationSec} seconds)`);
  console.log(`  - Processing Speed:     ${throughput} cards/second`);
  console.log(`  - Successful Cards:     ${successful} / ${scale} (${failed === 0 ? '0% Failure' : `${failed} Failed`})`);
  console.log(`  - Peak Heap Used:       ${formatBytes(memAfter.heapUsed)} (Diff: ${formatBytes(heapDiff)})`);
  console.log(`  - RSS Footprint:        ${formatBytes(memAfter.rss)} (Diff: ${formatBytes(rssDiff)})`);
  console.log(`  - CPU Usage:            User: ${(cpuAfter.user / 1000).toFixed(1)} ms, System: ${(cpuAfter.system / 1000).toFixed(1)} ms`);
  console.log(`  - Combined PDF Size:    ${formatBytes(pdfSize)} (${scale} pages)`);
  console.log(`  - ZIP Archive Size:     ${formatBytes(zipSize)} (${scale} individual PDFs)`);
  console.log(`  - Total Batch Storage:  ${formatBytes(totalStorage)}`);

  // Cleanup bench files
  try {
    if (fs.existsSync(combinedPdfPath)) fs.unlinkSync(combinedPdfPath);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(samplePhotoPath)) fs.unlinkSync(samplePhotoPath);
  } catch {}

  return {
    scale,
    durationMs,
    durationSec,
    throughput,
    successful,
    failed,
    failureRate: `${((failed / scale) * 100).toFixed(1)}%`,
    heapUsed: formatBytes(memAfter.heapUsed),
    rss: formatBytes(memAfter.rss),
    cpuUserMs: Math.round(cpuAfter.user / 1000),
    cpuSystemMs: Math.round(cpuAfter.system / 1000),
    pdfSizeBytes: pdfSize,
    pdfSizeFormatted: formatBytes(pdfSize),
    zipSizeBytes: zipSize,
    zipSizeFormatted: formatBytes(zipSize),
    totalStorageFormatted: formatBytes(totalStorage),
  };
}

async function runPerformanceSuite() {
  console.log('================================================================');
  console.log('KYORIX ATHLETE ID SYSTEM - PHASE 4 PERFORMANCE BENCHMARK');
  console.log(`System: ${os.type()} ${os.arch()} | CPUs: ${os.cpus().length} | Memory: ${formatBytes(os.totalmem())}`);
  console.log('================================================================');

  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }

  const results = [];
  const scales = [10, 100, 500, 1000];

  for (const scale of scales) {
    const res = await benchmarkScale(scale);
    results.push(res);
  }

  console.log('\n================================================================');
  console.log('PERFORMANCE BENCHMARK SUMMARY TABLE');
  console.log('================================================================');
  console.log('Scale   | Duration   | Throughput   | Heap Used | Combined PDF | ZIP Archive | Failure Rate');
  console.log('--------+------------+--------------+-----------+--------------+-------------+-------------');
  for (const r of results) {
    console.log(
      `${String(r.scale).padEnd(7)} | ` +
      `${String(r.durationSec + 's').padEnd(10)} | ` +
      `${String(r.throughput + ' c/s').padEnd(12)} | ` +
      `${String(r.heapUsed).padEnd(9)} | ` +
      `${String(r.pdfSizeFormatted).padEnd(12)} | ` +
      `${String(r.zipSizeFormatted).padEnd(11)} | ` +
      `${r.failureRate}`
    );
  }
  console.log('================================================================\n');

  // Clean up directory
  try {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  } catch {}
}

runPerformanceSuite().catch((err) => {
  console.error('[BENCHMARK ERROR]', err);
  process.exit(1);
});

