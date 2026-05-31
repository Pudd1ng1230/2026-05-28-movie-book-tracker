const express = require('express');
const db = require('../db');
const router = express.Router();

// ── 清单 CRUD ──

// 获取所有清单
router.get('/', (req, res) => {
  const lists = db.prepare('SELECT * FROM lists ORDER BY created_at DESC').all();
  res.json(lists);
});

// 创建清单
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: '清单名称不能为空' });
  const result = db.prepare('INSERT INTO lists (name, description) VALUES (?, ?)').run(name, description || '');
  const list = db.prepare('SELECT * FROM lists WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(list);
});

// 更新清单
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '清单不存在' });
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: '清单名称不能为空' });
  db.prepare('UPDATE lists SET name = ?, description = ? WHERE id = ?').run(name, description || '', req.params.id);
  res.json(db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id));
});

// 删除清单（级联删除 list_items）
router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM lists WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: '清单不存在' });
  db.prepare('DELETE FROM lists WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ── 清单内的电影 ──

// 获取清单内的所有电影（JOIN items 拿到完整信息）
router.get('/:id/items', (req, res) => {
  const items = db.prepare(`
    SELECT i.*, li.watch_progress AS list_progress, li.added_at AS list_added_at, li.id AS list_item_id
    FROM list_items li
    JOIN items i ON i.id = li.item_id
    WHERE li.list_id = ?
    ORDER BY li.added_at DESC
  `).all(req.params.id);
  res.json(items.map(item => ({ ...item, tags: JSON.parse(item.tags || '[]') })));
});

// 添加电影到清单
router.post('/:id/items', (req, res) => {
  const { item_id } = req.body;
  if (!item_id) return res.status(400).json({ error: '请提供 item_id' });
  // 检查是否存在
  const list = db.prepare('SELECT id FROM lists WHERE id = ?').get(req.params.id);
  if (!list) return res.status(404).json({ error: '清单不存在' });
  const item = db.prepare('SELECT id FROM items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: '电影不存在' });
  // 防重复
  const dup = db.prepare('SELECT id FROM list_items WHERE list_id = ? AND item_id = ?').get(req.params.id, item_id);
  if (dup) return res.status(409).json({ error: '该电影已在清单中' });
  // 同步：添加时复制电影的当前 watch_progress 到清单项
  db.prepare('INSERT INTO list_items (list_id, item_id, watch_progress) VALUES (?, ?, ?)')
    .run(req.params.id, item_id, item.watch_progress || '');
  res.status(201).json({ ok: true });
});

// 从清单移除电影
router.delete('/:id/items/:itemId', (req, res) => {
  db.prepare('DELETE FROM list_items WHERE list_id = ? AND item_id = ?').run(req.params.id, req.params.itemId);
  res.json({ ok: true });
});

// 更新清单内电影的观看状态（同时同步到全局 item）
router.patch('/:id/items/:itemId/progress', (req, res) => {
  const { progress } = req.body;
  const val = progress || '';
  // 更新清单内的进度
  db.prepare('UPDATE list_items SET watch_progress = ? WHERE list_id = ? AND item_id = ?')
    .run(val, req.params.id, req.params.itemId);
  // 同步到全局 items 表
  db.prepare('UPDATE items SET watch_progress = ?, watched = ? WHERE id = ?')
    .run(val, val === '已看' ? 1 : 0, req.params.itemId);
  res.json({ ok: true, progress: val });
});

module.exports = router;
