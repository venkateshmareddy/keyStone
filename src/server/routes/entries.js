'use strict';

/**
 * Entries API
 *
 * GET  /api/entries               — list all entries (titles only, lazy-load)
 * GET  /api/entries/folder/:folderId — entries for a folder (titles only)
 * GET  /api/entries/:id           — single entry FULL content ("retrieve on click")
 * POST /api/entries               — create entry
 * PUT  /api/entries/:id           — update entry
 * DELETE /api/entries/:id         — delete entry
 */

const router     = require('express').Router();
const db         = require('../config/database');
const { encrypt, decrypt } = require('../services/encryption');

// ── Shared column list for LIST responses (lazy — no heavy content cols) ─────
const LIST_COLS = `
  e.id, e.title, e.type, e.folder_id, e.is_pinned,
  e.sort_order, e.created_at, e.updated_at,
  COALESCE(
    json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
    FILTER (WHERE t.id IS NOT NULL),
    '[]'
  ) AS tags
`;

const LIST_JOINS = `
  FROM entries e
  LEFT JOIN entry_tags et ON et.entry_id = e.id
  LEFT JOIN tags t        ON t.id = et.tag_id
`;

// GET /api/entries/folder/:folderId — lazy-load entries for a folder
router.get('/folder/:folderId', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${LIST_COLS}
         ${LIST_JOINS}
        WHERE e.folder_id = $1
        GROUP BY e.id
        ORDER BY e.is_pinned DESC, e.sort_order ASC, e.updated_at DESC`,
      [req.params.folderId],
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/entries — all entries (lazy list, no secret content)
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT ${LIST_COLS}
         ${LIST_JOINS}
        GROUP BY e.id
        ORDER BY e.is_pinned DESC, e.updated_at DESC`,
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/entries/:id — FULL entry ("retrieve on click")
// For secrets: decrypts encrypted_content before returning
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT
         e.id, e.title, e.type, e.content, e.url, e.encrypted_content,
         e.folder_id, e.is_pinned, e.sort_order, e.created_at, e.updated_at,
         COALESCE(
           json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color))
           FILTER (WHERE t.id IS NOT NULL),
           '[]'
         ) AS tags
       FROM entries e
       LEFT JOIN entry_tags et ON et.entry_id = e.id
       LEFT JOIN tags t        ON t.id = et.tag_id
       WHERE e.id = $1
       GROUP BY e.id`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });

    const entry = rows[0];

    // Decrypt secret on the fly — never expose raw encrypted_content
    if (entry.type === 'secret' && entry.encrypted_content) {
      try {
        entry.secret = decrypt(entry.encrypted_content);
      } catch {
        entry.secret = null;
        entry.decryptError = 'Could not decrypt — check ENCRYPTION_KEY';
      }
      delete entry.encrypted_content;
    }

    res.json(entry);
  } catch (err) { next(err); }
});

// POST /api/entries — create entry
router.post('/', async (req, res, next) => {
  try {
    const {
      title, type = 'note', content, url,
      secret,          // plaintext secret — will be encrypted
      folder_id = null, is_pinned = false, sort_order = 0, tags = [],
    } = req.body || {};

    if (!title || !title.trim()) return res.status(400).json({ error: '`title` is required' });
    if (!['note', 'link', 'secret'].includes(type))
      return res.status(400).json({ error: '`type` must be note | link | secret' });

    let encrypted_content = null;
    if (type === 'secret') {
      if (!secret) return res.status(400).json({ error: '`secret` is required for type=secret' });
      encrypted_content = encrypt(secret);
    }

    const { rows } = await db.query(
      `INSERT INTO entries (title, type, content, url, encrypted_content, folder_id, is_pinned, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, type, folder_id, is_pinned, sort_order, created_at, updated_at`,
      [title.trim(), type, content || null, url || null, encrypted_content, folder_id, is_pinned, sort_order],
    );
    const entry = rows[0];

    // Attach tags
    if (tags.length) {
      for (const tagId of tags) {
        await db.query(
          'INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [entry.id, tagId],
        );
      }
    }

    res.status(201).json(entry);
  } catch (err) { next(err); }
});

// PUT /api/entries/:id — update entry
router.put('/:id', async (req, res, next) => {
  try {
    const {
      title, content, url, secret,
      folder_id, is_pinned, sort_order, tags,
    } = req.body || {};

    // If secret is being updated, re-encrypt
    let encrypted_content;
    if (secret !== undefined) {
      encrypted_content = secret ? encrypt(secret) : null;
    }

    const { rows } = await db.query(
      `UPDATE entries
          SET title             = COALESCE($1, title),
              content           = COALESCE($2, content),
              url               = COALESCE($3, url),
              encrypted_content = COALESCE($4, encrypted_content),
              folder_id         = COALESCE($5, folder_id),
              is_pinned         = COALESCE($6, is_pinned),
              sort_order        = COALESCE($7, sort_order)
        WHERE id = $8
       RETURNING id, title, type, folder_id, is_pinned, sort_order, created_at, updated_at`,
      [
        title  || null,
        content !== undefined ? content : null,
        url    || null,
        encrypted_content !== undefined ? encrypted_content : null,
        folder_id !== undefined ? folder_id : null,
        is_pinned !== undefined ? is_pinned : null,
        sort_order !== undefined ? sort_order : null,
        req.params.id,
      ],
    );
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });

    // Replace tags if provided
    if (Array.isArray(tags)) {
      await db.query('DELETE FROM entry_tags WHERE entry_id = $1', [req.params.id]);
      for (const tagId of tags) {
        await db.query(
          'INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.params.id, tagId],
        );
      }
    }

    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/entries/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM entries WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Entry not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
