/**
 * Schema Initialization Script
 * Creates the isolated PostgreSQL schema for Kyorix Athlete ID Card Generation System
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

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

async function initSchema() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL || process.env.DATABASE_URL,
      },
    },
  });

  try {
    console.log('[INIT] Ensuring dedicated schema "athlete_id_system" exists in PostgreSQL...');
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS athlete_id_system;`);
    console.log('[SUCCESS] Schema "athlete_id_system" is verified and ready.');
  } catch (err) {
    console.error('[ERROR] Failed to ensure schema:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initSchema();

