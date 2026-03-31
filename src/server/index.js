'use strict';

require('dotenv').config({ path: '../../.env' });

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');

const foldersRouter = require('./routes/folders');
const entriesRouter = require('./routes/entries');
const tagsRouter    = require('./routes/tags');
const authRouter    = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ────────────────────────────────────────
app.use(helmet());

// ── CORS — allow the Vite dev server and production origin ──
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (e.g. curl, mobile)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ── Rate limiting ────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Health check (public) ───────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Auth routes (public — used to validate key) ─────────────
app.use('/api/auth', authRouter);

// ── Protected API routes ────────────────────────────────────
app.use('/api/folders', authMiddleware, foldersRouter);
app.use('/api/entries', authMiddleware, entriesRouter);
app.use('/api/tags',    authMiddleware, tagsRouter);

// ── 404 handler ──────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => console.log(`KeyStone API listening on port ${PORT}`));

module.exports = app; // for testing
