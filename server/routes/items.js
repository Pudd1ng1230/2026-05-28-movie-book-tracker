const express = require('express');
const db = require('../db');
const router = express.Router();

// ── 搜索电影（模糊匹配名称，返回列表+简要排名） ──
router.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);

  const movies = db.prepare(`
    SELECT id, name, year, director, category, poster,
           douban_rating, douban_votes, rating,
           watched, watch_progress, review
    FROM items
    WHERE type = 'movie' AND (name LIKE ? OR director LIKE ?)
    ORDER BY douban_rating DESC
    LIMIT 50
  `).all(`%${q}%`, `%${q}%`);

  // 统计总量（用于排名计算）
  const totalMovies = db.prepare(
    "SELECT COUNT(*) AS cnt FROM items WHERE type = 'movie' AND douban_rating IS NOT NULL"
  ).get().cnt;

  // 为每部电影附加简要排名
  const results = movies.map(m => {
    const betterCount = db.prepare(
      "SELECT COUNT(*) AS cnt FROM items WHERE type = 'movie' AND douban_rating > ?"
    ).get(m.douban_rating || 0).cnt;

    return {
      ...m,
      tags: [],
      overall_rank: betterCount + 1,
      overall_total: totalMovies,
      overall_percentile: totalMovies > 0
        ? Math.round((1 - (betterCount + 1) / totalMovies) * 100)
        : 0,
    };
  });

  res.json(results);
});

// ── 电影详细排名（按 ID） ──
router.get('/:id/ranking', (req, res) => {
  const movie = db.prepare(
    'SELECT id, name, year, director, category, douban_rating, douban_votes, rating FROM items WHERE id = ? AND type = ?'
  ).get(req.params.id, 'movie');

  if (!movie) return res.status(404).json({ error: 'Not found or not a movie' });

  const score = movie.douban_rating || movie.rating || 0;
  const year = movie.year;
  const director = movie.director;
  // 取第一个分类
  const firstCategory = (movie.category || '').split('/')[0].trim();

  const rank = (extraWhere, extraParam) => {
    const baseWhere = extraParam !== undefined
      ? `type = 'movie' AND ${extraWhere}`
      : "type = 'movie'";

    // 比当前电影评分更高的数量（extraParam 对应 extraWhere 中的 ?，score 对应 douban_rating > ?）
    const betterParams = extraParam !== undefined ? [extraParam, score] : [score];
    const betterSql = `SELECT COUNT(*) AS cnt FROM items WHERE ${baseWhere} AND douban_rating > ?`;
    const better = db.prepare(betterSql).get(...betterParams).cnt;

    // 该维度总电影数
    const totalParams = extraParam !== undefined ? [extraParam] : [];
    const totalSql = `SELECT COUNT(*) AS cnt FROM items WHERE ${baseWhere} AND douban_rating IS NOT NULL`;
    const total = db.prepare(totalSql).get(...totalParams).cnt;

    return {
      rank: better + 1,
      total,
      percentile: total > 0 ? Math.round((1 - (better + 1) / total) * 100) : 0,
    };
  };

  const ranking = {
    overall: rank(),
    by_year: year ? rank('year = ?', year) : null,
    by_category: firstCategory
      ? rank('category LIKE ?', `${firstCategory}%`)
      : null,
    by_director: director
      ? rank('director = ?', director)
      : null,
  };

  res.json({ movie, ranking });
});

// List all items with optional filters + pagination
router.get('/', (req, res) => {
  const { type, category, year, search, sort, watched, has_review, progress, rating_min, rating_max, has_interaction, limit, offset } = req.query;
  let where = 'WHERE 1=1';
  const params = [];

  if (type) { where += ' AND type = ?'; params.push(type); }
  if (category) { where += ' AND category LIKE ?'; params.push(`%${category}%`); }
  if (year) { where += ' AND year = ?'; params.push(Number(year)); }
  if (search) { where += ' AND name LIKE ?'; params.push(`%${search}%`); }
  if (watched !== undefined) { where += ' AND watched = ?'; params.push(watched === '1' ? 1 : 0); }
  if (has_review === '1') { where += " AND review != ''"; }
  if (progress) { where += ' AND watch_progress = ?'; params.push(progress); }
  if (rating_min) { where += ' AND rating >= ?'; params.push(Number(rating_min)); }
  if (rating_max) { where += ' AND rating <= ?'; params.push(Number(rating_max)); }
  if (has_interaction === '1') { where += " AND (watched = 1 OR rating IS NOT NULL OR review != '')"; }

  let orderBy = ' ORDER BY created_at DESC';
  if (sort === 'user_rating_desc') orderBy = ' ORDER BY rating DESC';
  else if (sort === 'user_rating_asc') orderBy = ' ORDER BY rating ASC';
  else if (sort === 'douban_rating_desc') orderBy = ' ORDER BY douban_rating DESC';
  else if (sort === 'douban_rating_asc') orderBy = ' ORDER BY douban_rating ASC';
  else if (sort === 'date_desc') orderBy = ' ORDER BY date DESC';
  else if (sort === 'date_asc') orderBy = ' ORDER BY date ASC';

  // 总数
  const countSql = `SELECT COUNT(*) AS cnt FROM items ${where}`;
  const total = db.prepare(countSql).get(...params).cnt;

  // 分页数据
  let dataSql = `SELECT * FROM items ${where}${orderBy}`;
  const dataParams = [...params];
  const lim = parseInt(limit, 10) || 0;
  const off = parseInt(offset, 10) || 0;
  if (lim > 0) { dataSql += ' LIMIT ? OFFSET ?'; dataParams.push(lim, off); }

  const items = db.prepare(dataSql).all(...dataParams);

  res.json({
    items: items.map(item => ({ ...item, tags: JSON.parse(item.tags || '[]') })),
    total,
  });
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

// ── 用户操作：标记已看/未看 ──
router.patch('/:id/watched', (req, res) => {
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { watched } = req.body;
  const val = watched ? 1 : 0;
  db.prepare('UPDATE items SET watched = ? WHERE id = ?').run(val, req.params.id);
  res.json({ ok: true, watched: val });
});

// ── 用户操作：更新观看进度（同时同步到所有清单） ──
router.patch('/:id/progress', (req, res) => {
  const existing = db.prepare('SELECT id FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { progress } = req.body;
  const val = progress || '';
  // 更新全局进度
  db.prepare('UPDATE items SET watch_progress = ? WHERE id = ?').run(val, req.params.id);
  // 同步到所有包含此电影的清单
  db.prepare('UPDATE list_items SET watch_progress = ? WHERE item_id = ?').run(val, req.params.id);
  res.json({ ok: true, progress: val });
});

// ── 批量操作：设置进度 ──
router.patch('/batch/progress', (req, res) => {
  const { ids, progress } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: '请提供 ids 数组' });
  }
  const val = progress || '';
  const watchedVal = val === '已看' ? 1 : 0;
  const placeholders = ids.map(() => '?').join(',');
  // 批量更新
  db.prepare(`UPDATE items SET watch_progress = ?, watched = ? WHERE id IN (${placeholders})`).run(val, watchedVal, ...ids);
  db.prepare(`UPDATE list_items SET watch_progress = ? WHERE item_id IN (${placeholders})`).run(val, ...ids);
  res.json({ ok: true, count: ids.length });
});

// Delete item
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
