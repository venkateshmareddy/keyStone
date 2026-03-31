'use strict';

/**
 * API-Key authentication middleware.
 *
 * Clients must send one of:
 *   Authorization: Bearer <API_KEY>
 *   x-api-key: <API_KEY>
 *
 * The key is compared against the API_KEY environment variable using a
 * constant-time comparison to prevent timing attacks.
 */

const crypto = require('crypto');

const API_KEY = process.env.API_KEY || '';

if (!API_KEY) {
  console.warn('[auth] WARNING: API_KEY is not set — all requests will be rejected');
}

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // prevent length-based timing leak
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const apiKeyHeader = req.headers['x-api-key'] || '';

  let provided = '';
  if (authHeader.startsWith('Bearer ')) {
    provided = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    provided = apiKeyHeader.trim();
  }

  if (!provided || !API_KEY || !timingSafeEqual(provided, API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing API key' });
  }

  next();
};
