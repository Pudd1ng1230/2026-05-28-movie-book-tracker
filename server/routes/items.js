const express = require('express');
const db = require('../db');
const router = express.Router();

// List all items with optional filters
router.get('/', (req, res) => {
  const { type, category, search, sort } = req.query;
  let sql = 'SELECT * FROM items WHERE 1=1';
  const params = [];

  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }

  if (sort === 'rating_desc') sql += ' ORDER BY rating DESC';
  else if (sort === 'rating_asc') sql += ' ORDER BY rating ASC';
  else if (sort === 'date_desc') sql += ' ORDER BY date DESC';
  else if (sort === 'date_asc') sql += ' ORDER BY date ASC';
  else sql += ' ORDER BY created_at DESC';

  const items = db.prepare(sql).all(...params);
  res.json(items.map(item => ({ ...item, tags: JSON.parse(item.tags || '[]') })));
});

// Get single item
router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  item.tags = JSON.parse(item.tags || '[]');
  res.json(item);
});

// Create item
router.post('/', (req, res) => {
  const { name, type, category, tags, director, year, rating, review, date, poster, summary } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

  const result = db.prepare(`
    INSERT INTO items (name, type, category, tags, director, year, rating, review, date, poster, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type, category || '', JSON.stringify(tags || []), director || '', year || null,
    rating || null, review || '', date || '', poster || '', summary || '');

  res.status(201).json({ id: result.lastInsertRowid });
});

// Update item
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const fields = ['name', 'type', 'category', 'director', 'year', 'rating', 'review', 'date', 'poster', 'summary'];
  const sets = [];
  const params = [];

  fields.forEach(f => {
    if (req.body[f] !== undefined) {
      if (f === 'type' && !['movie', 'tv', 'book'].includes(req.body[f])) return;
      sets.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });

  if (req.body.tags !== undefined) {
    sets.push('tags = ?');
    params.push(JSON.stringify(req.body.tags));
  }

  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// Delete item
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
