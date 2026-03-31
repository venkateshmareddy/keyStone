'use strict';

/**
 * Folders API
 *
 * GET  /api/folders/tree       — full folder tree (no entry data)
 * GET  /api/folders/:id        — single folder metadata
 * POST /api/folders            — create folder
 * PUT  /api/folders/:id        — update folder
 * DELETE /api/folders/:id      — delete folder (cascades to children)
 */

const router = require('express').Router();
const db     = require('../config/database');

// ── Helper: build nested tree from flat rows ─────────────────────────────────
function buildTree(rows) {
  const map  = {};
  const roots = [];
  rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
  rows.forEach(r => {
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(map[r.id]);
    } else {
      roots.push(map[r.id]);
    }
  });
  return roots;
}

// GET /api/folders/tree
router.get('/tree', async (_req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, parent_id, icon, sort_order, created_at, updated_at
         FROM folders
        ORDER BY sort_order ASC, name ASC`,
    );
    res.json(buildTree(rows));
  } catch (err) { next(err); }
});

// GET /api/folders/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, name, parent_id, icon, sort_order, created_at, updated_at
         FROM folders WHERE id = $1`,
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Folder not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// POST /api/folders
router.post('/', async (req, res, next) => {
  try {
    const { name, parent_id = null, icon = '📁', sort_order = 0 } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: '`name` is required' });
    const { rows } = await db.query(
      `INSERT INTO folders (name, parent_id, icon, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), parent_id || null, icon, sort_order],
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/folders/:id
router.put('/:id', async (req, res, next) => {
  try {
    const { name, parent_id, icon, sort_order } = req.body || {};
    const { rows } = await db.query(
      `UPDATE folders
          SET name       = COALESCE($1, name),
              parent_id  = COALESCE($2, parent_id),
              icon       = COALESCE($3, icon),
              sort_order = COALESCE($4, sort_order)
        WHERE id = $5
       RETURNING *`,
      [name || null, parent_id || null, icon || null, sort_order ?? null, req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: 'Folder not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/folders/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rowCount } = await db.query('DELETE FROM folders WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Folder not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
