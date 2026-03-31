'use strict';

/**
 * Simple migration runner — applies SQL files in order.
 * Usage: node scripts/migrate.js [--seed]
 */

require('dotenv').config({ path: '../../.env' });
const path = require('path');
const fs   = require('fs');
const { pool } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../../../db/migrations');

async function run() {
  const seed = process.argv.includes('--seed');
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql') && (seed || !f.includes('seed')))
    .sort();

  console.log(`Running ${files.length} migration file(s)…`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`  ▶ ${file}`);
    await pool.query(sql);
  }

  console.log('✓ Migrations complete');
  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
