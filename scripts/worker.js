/**
 * Standalone Continuous Background Worker Daemon
 * Kyorix Sports Technology - Athlete ID Card Generation Platform
 *
 * Usage:
 *   npm run worker
 *   node scripts/worker.js
 */

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

const { claimNextQueuedJob, processJob, recoverStaleJobs } = require('../src/lib/queue/worker.ts');

const workerId = `daemon-${process.pid}-${Date.now()}`;
let isRunning = true;
let activeJobId = null;

console.log('================================================================');
console.log(`KYORIX ATHLETE ID SYSTEM - BACKGROUND WORKER DAEMON STARTED`);
console.log(`Worker ID: ${workerId} | PID: ${process.pid}`);
console.log('================================================================');

async function workerLoop() {
  let lastStaleRecovery = 0;

  while (isRunning) {
    try {
      const now = Date.now();

      // Periodically recover stale/orphaned jobs every 60 seconds
      if (now - lastStaleRecovery > 60000) {
        lastStaleRecovery = now;
        const recovered = await recoverStaleJobs(10);
        if (recovered > 0) {
          console.log(`[WORKER] Recovered ${recovered} abandoned/stale job(s).`);
        }
      }

      // Atomically claim the next queued job
      const claimedJobId = await claimNextQueuedJob(workerId);

      if (claimedJobId) {
        activeJobId = claimedJobId;
        console.log(`[WORKER] Claimed job: ${claimedJobId}`);
        const startTime = Date.now();

        await processJob(claimedJobId, workerId);

        console.log(`[WORKER] Finished job ${claimedJobId} in ${Date.now() - startTime}ms.`);
        activeJobId = null;
      } else {
        // No queued jobs, sleep 1.5 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    } catch (err) {
      console.error('[WORKER ERROR] Error in worker processing loop:', err);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  console.log('[WORKER] Worker process gracefully shut down.');
  process.exit(0);
}

// Graceful shutdown handling
function handleShutdown(signal) {
  console.log(`\n[WORKER] Received ${signal}. Initiating graceful shutdown...`);
  isRunning = false;

  if (activeJobId) {
    console.log(`[WORKER] Waiting for active job ${activeJobId} to wrap up...`);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

workerLoop().catch((err) => {
  console.error('[WORKER FATAL]', err);
  process.exit(1);
});

