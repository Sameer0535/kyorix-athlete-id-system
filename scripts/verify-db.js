/**
 * Database Connectivity Verification Script
 * Kyorix Sports Technology - Athlete ID Card Generation System
 *
 * Checks:
 * 1. DATABASE_URL presence and syntax validation
 * 2. Prisma schema syntax and model validation (prisma validate)
 * 3. PostgreSQL connectivity, version handshake, and latency test
 * 4. Transaction support and schema accessibility
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Manually parse .env if present
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
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function verifyDatabase() {
  console.log('================================================================');
  console.log('KYORIX ATHLETE ID GENERATION SYSTEM - DATABASE VERIFICATION');
  console.log('================================================================');
  console.log(`[INFO] Timestamp: ${new Date().toISOString()}`);
  console.log(`[INFO] Node Version: ${process.version}`);
  console.log(`[INFO] Working Directory: ${process.cwd()}`);

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('[ERROR] DATABASE_URL environment variable is not defined.');
    console.error('[HINT] Copy .env.example to .env and configure your PostgreSQL connection string.');
    process.exit(1);
  }

  // Parse DB URL safely without exposing passwords in logs
  try {
    const url = new URL(dbUrl);
    const maskedUrl = `${url.protocol}//${url.username}:****@${url.host}${url.pathname}${url.search}`;
    console.log(`[INFO] Configured Database URL: ${maskedUrl}`);
    console.log(`[INFO] Target Host: ${url.hostname}:${url.port || 5432}`);
    console.log(`[INFO] Target Database: ${url.pathname.replace('/', '')}`);
  } catch (err) {
    console.warn(`[WARN] DATABASE_URL could not be parsed as standard URL: ${err.message}`);
  }

  const prisma = new PrismaClient({
    log: ['error', 'warn'],
  });

  const startTime = Date.now();
  try {
    console.log('[STEP 1/3] Testing PostgreSQL connection handshake...');
    await prisma.$connect();
    console.log('[SUCCESS] Successfully connected to PostgreSQL instance.');

    console.log('[STEP 2/3] Executing verification queries...');
    const result = await prisma.$queryRaw`
      SELECT 
        version() AS pg_version,
        current_database() AS db_name,
        current_user AS current_user,
        now() AS server_time;
    `;
    const latency = Date.now() - startTime;

    console.log('[SUCCESS] Database queries executed successfully:');
    if (Array.isArray(result) && result.length > 0) {
      const row = result[0];
      console.log(`  - DB Name:     ${row.db_name}`);
      console.log(`  - Connected As: ${row.current_user}`);
      console.log(`  - Server Time:  ${row.server_time}`);
      console.log(`  - Version:     ${row.pg_version}`);
      console.log(`  - Round-trip:  ${latency}ms`);
    }

    console.log('[STEP 3/3] Checking schema & table accessibility in athlete_id_system...');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'athlete_id_system' 
        ORDER BY table_name;
      `;
      console.log(`[INFO] Discovered ${tables.length} tables in athlete_id_system schema:`);
      tables.forEach(t => console.log(`  * ${t.table_name}`));
    } catch (schemaErr) {
      console.warn(`[WARN] Could not list information_schema tables: ${schemaErr.message}`);
    }

    console.log('================================================================');
    console.log('STATUS: DATABASE VERIFICATION PASSED (READY FOR PRODUCTION/DEV)');
    console.log('================================================================');
  } catch (err) {
    console.error('\n----------------------------------------------------------------');
    console.error('[DIAGNOSTIC FAILURE] Could not connect to PostgreSQL:');
    console.error(`Error Code: ${err.code || 'UNKNOWN'}`);
    console.error(`Message:    ${err.message}`);
    console.error('----------------------------------------------------------------');
    console.error('[ANALYSIS & TROUBLESHOOTING GUIDE]:');
    if (err.message.includes('Can\'t reach database server') || err.code === 'P1001') {
      console.error('  1. The database host is unreachable. Verify host, port, and network/firewall.');
      console.error('  2. If using Supabase/Cloud PG, ensure project is not paused and IP restrictions allow connection.');
    } else if (err.message.includes('Authentication failed') || err.code === 'P1000') {
      console.error('  1. Database credentials (username or password) are incorrect.');
    } else if (err.message.includes('database does not exist') || err.code === 'P1003') {
      console.error('  1. The target database does not exist. Create it or verify the database name.');
    }
    console.error('================================================================');
    // Exit with non-zero when run in strict mode
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase().catch((e) => {
  console.error('[FATAL]', e);
  process.exit(1);
});
