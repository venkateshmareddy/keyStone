'use strict';

/**
 * Tags API
 *
 * GET    /api/tags        — list all tags
 * POST   /api/tags        — create tag
 * PUT    /api/tags/:id    — update tag
 * DELETE /api/tags/:id    — delete tag
 */

const router = require('express').Router();
const db     = require('../config/database');

// GET /api/tags
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, color, created_at FROM tags ORDER BY name ASC',
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/tags
router.post('/', async (req, res, next) => {
  try {
    const { name, color = '#6366f1' } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: '`name` is required' });
    const { rows } = await db.query(
      `INSERT INTO tags (name, color) VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
       RETURNING *`,
      [name.trim().toLowerCase(), color],
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/tags/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, color } = req.body || {};
    const { rows } = await db.query(
      `UPDATE tags
          SET name  = COALESCE($1, name),
              color = COALESCE($2, color)
        WHERE id = $3
       RETURNING *`,
      [name || null, color || null, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Tag not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/tags/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM tags WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Tag not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
