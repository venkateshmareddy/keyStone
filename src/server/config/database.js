'use strict';

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB       || 'keystone',
  user:     process.env.POSTGRES_USER     || 'keystone',
  password: process.env.POSTGRES_PASSWORD || 'changeme',
  max:      10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err.message);
});

/**
 * Execute a parameterised query against the pool.
 * @param {string} text   SQL string with $1, $2 … placeholders
 * @param {any[]}  params Parameter values
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const ms = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.debug(`[db] query (${ms}ms)`, text.slice(0, 80));
    }
    return result;
  } catch (err) {
    console.error('[db] query error', err.message, '\nSQL:', text);
    throw err;
  }
}

module.exports = { pool, query };
