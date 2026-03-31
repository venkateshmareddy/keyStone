'use strict';

/**
 * Auth route — lets the client validate its API key and get basic info.
 * POST /api/auth/validate  { "apiKey": "..." }
 */

const router  = require('express').Router();
const crypto  = require('crypto');

const API_KEY = process.env.API_KEY || '';

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// POST /api/auth/validate
router.post('/validate', (req, res) => {
  const { apiKey } = req.body || {};
  if (!apiKey || !API_KEY || !timingSafeEqual(String(apiKey), API_KEY)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  res.json({ ok: true, message: 'API key is valid' });
});

module.exports = router;
