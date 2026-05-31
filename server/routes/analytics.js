const express = require('express');
const db = require('../db');
const router = express.Router();

// 评分来源：全站优先豆瓣评分；个人用用户评分
const R = 'COALESCE(douban_rating, rating)';

// ── 工具函数：拆分多值字段并独立聚合 ──
// 将 category("动作/科幻") 或 director("张三, 李四") 拆成独立条目后再算平均分
function splitAggregate(rows, field, delimiter, scoreField) {
  const map = {}; // { individualValue: [score1, score2, ...] }
  rows.forEach(row => {
    const score = row[scoreField];
    if (score == null) return;
    const raw = (row[field] || '').trim();
    if (!raw) return;
    const parts = raw.split(delimiter).map(s => s.trim()).filter(Boolean);
    parts.forEach(part => {
      if (!map[part]) map[part] = [];
      map[part].push(score);
    });
  });
  return Object.entries(map)
    .map(([name, scores]) => ({
      [field]: name,
      avg_rating: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      count: scores.length,
    }))
    .sort((a, b) => b.avg_rating - a.avg_rating || b.count - a.count);
}

// ── 独立端点 ──

router.get('/rating-distribution', (req, res) => {
  const rows = db.prepare(`
    SELECT CASE
      WHEN ${R} BETWEEN 1 AND 2 THEN '1-2'
      WHEN ${R} BETWEEN 3 AND 4 THEN '3-4'
      WHEN ${R} BETWEEN 5 AND 6 THEN '5-6'
      WHEN ${R} BETWEEN 7 AND 8 THEN '7-8'
      WHEN ${R} BETWEEN 9 AND 10 THEN '9-10'
    END AS bucket, COUNT(*) AS count
    FROM items WHERE ${R} IS NOT NULL
    GROUP BY bucket ORDER BY bucket
  `).all();
  res.json(rows);
});

router.get('/avg-by-category', (req, res) => {
  const rows = db.prepare(
    `SELECT category, ${R} AS score FROM items WHERE ${R} IS NOT NULL AND category != ''`
  ).all();
  res.json(splitAggregate(rows, 'category', '/', 'score'));
});

router.get('/avg-by-director', (req, res) => {
  const rows = db.prepare(
    `SELECT director, ${R} AS score FROM items WHERE ${R} IS NOT NULL AND director != ''`
  ).all();
  res.json(splitAggregate(rows, 'director', ', ', 'score').slice(0, 10));
});

router.get('/avg-by-year', (req, res) => {
  const rows = db.prepare(`
    SELECT year, ROUND(AVG(${R}), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE ${R} IS NOT NULL AND year IS NOT NULL
    GROUP BY year ORDER BY year
  `).all();
  res.json(rows);
});

router.get('/timeline', (req, res) => {
  const rows = db.prepare(`
    SELECT substr(date, 1, 7) AS month, COUNT(*) AS count
    FROM items WHERE date != ''
    GROUP BY month ORDER BY month
  `).all();
  res.json(rows);
});

router.get('/tag-preference', (req, res) => {
  const items = db.prepare("SELECT tags FROM items WHERE tags != '[]'").all();
  const tagCount = {};
  items.forEach(item => {
    JSON.parse(item.tags).forEach(tag => {
      // 标签也可能内含 "/"，同样拆分
      tag.split('/').map(t => t.trim()).filter(Boolean).forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
  });
  const result = Object.entries(tagCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  res.json(result);
});

router.get('/summary', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS count FROM items').get();
  const byType = db.prepare('SELECT type, COUNT(*) AS count FROM items GROUP BY type').all();
  const avgRating = db.prepare(`SELECT ROUND(AVG(${R}), 1) AS avg FROM items WHERE ${R} IS NOT NULL`).get();
  const topRated = db.prepare(`SELECT name, ${R} AS score, type FROM items WHERE ${R} IS NOT NULL ORDER BY ${R} DESC LIMIT 5`).all();

  res.json({
    total: total.count,
    byType,
    avgRating: avgRating.avg,
    topRated: topRated.map(t => ({ name: t.name, rating: t.score, type: t.type })),
  });
});

// ── 全站分析（一次性返回） ──
router.get('/all', (req, res) => {
  const ratingDist = db.prepare(`
    SELECT CASE
      WHEN ${R} BETWEEN 1 AND 2 THEN '1-2'
      WHEN ${R} BETWEEN 3 AND 4 THEN '3-4'
      WHEN ${R} BETWEEN 5 AND 6 THEN '5-6'
      WHEN ${R} BETWEEN 7 AND 8 THEN '7-8'
      WHEN ${R} BETWEEN 9 AND 10 THEN '9-10'
    END AS bucket, COUNT(*) AS count
    FROM items WHERE ${R} IS NOT NULL
    GROUP BY bucket ORDER BY bucket
  `).all();

  const catRows = db.prepare(
    `SELECT category, ${R} AS score FROM items WHERE ${R} IS NOT NULL AND category != ''`
  ).all();
  const avgByCategory = splitAggregate(catRows, 'category', '/', 'score');

  const dirRows = db.prepare(
    `SELECT director, ${R} AS score FROM items WHERE ${R} IS NOT NULL AND director != ''`
  ).all();
  const avgByDirector = splitAggregate(dirRows, 'director', ', ', 'score').slice(0, 10);

  const avgByYear = db.prepare(`
    SELECT year, ROUND(AVG(${R}), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE ${R} IS NOT NULL AND year IS NOT NULL
    GROUP BY year ORDER BY year
  `).all();

  const timeline = db.prepare(`
    SELECT substr(date, 1, 7) AS month, COUNT(*) AS count
    FROM items WHERE date != ''
    GROUP BY month ORDER BY month
  `).all();

  const tagItems = db.prepare("SELECT tags FROM items WHERE tags != '[]'").all();
  const tagCount = {};
  tagItems.forEach(item => {
    JSON.parse(item.tags).forEach(tag => {
      tag.split('/').map(t => t.trim()).filter(Boolean).forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
  });
  const tagPreference = Object.entries(tagCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = db.prepare('SELECT COUNT(*) AS count FROM items').get();
  const byType = db.prepare('SELECT type, COUNT(*) AS count FROM items GROUP BY type').all();
  const avgRating = db.prepare(`SELECT ROUND(AVG(${R}), 1) AS avg FROM items WHERE ${R} IS NOT NULL`).get();
  const topRated = db.prepare(`SELECT name, ${R} AS score, type FROM items WHERE ${R} IS NOT NULL ORDER BY ${R} DESC LIMIT 5`).all();

  res.json({
    ratingDistribution: ratingDist,
    avgByCategory,
    avgByDirector,
    avgByYear,
    timeline,
    tagPreference,
    summary: {
      total: total.count,
      byType,
      avgRating: avgRating.avg,
      topRated: topRated.map(t => ({ name: t.name, rating: t.score, type: t.type })),
    },
  });
});

// ── 个人分析 ──
const PERSONAL_WHERE = `(watched = 1 OR rating IS NOT NULL OR review != '' OR watch_progress != '')`;

router.get('/personal/all', (req, res) => {
  const ratingDist = db.prepare(`
    SELECT CASE
      WHEN rating BETWEEN 1 AND 2 THEN '1-2'
      WHEN rating BETWEEN 3 AND 4 THEN '3-4'
      WHEN rating BETWEEN 5 AND 6 THEN '5-6'
      WHEN rating BETWEEN 7 AND 8 THEN '7-8'
      WHEN rating BETWEEN 9 AND 10 THEN '9-10'
    END AS bucket, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND ${PERSONAL_WHERE}
    GROUP BY bucket ORDER BY bucket
  `).all();

  const catRows = db.prepare(
    `SELECT category, rating AS score FROM items WHERE rating IS NOT NULL AND category != '' AND ${PERSONAL_WHERE}`
  ).all();
  const avgByCategory = splitAggregate(catRows, 'category', '/', 'score');

  const dirRows = db.prepare(
    `SELECT director, rating AS score FROM items WHERE rating IS NOT NULL AND director != '' AND ${PERSONAL_WHERE}`
  ).all();
  const avgByDirector = splitAggregate(dirRows, 'director', ', ', 'score').slice(0, 10);

  const avgByYear = db.prepare(`
    SELECT year, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND year IS NOT NULL AND ${PERSONAL_WHERE}
    GROUP BY year ORDER BY year
  `).all();

  const timeline = db.prepare(`
    SELECT substr(date, 1, 7) AS month, COUNT(*) AS count
    FROM items WHERE date != '' AND ${PERSONAL_WHERE}
    GROUP BY month ORDER BY month
  `).all();

  const tagItems = db.prepare(`SELECT tags FROM items WHERE tags != '[]' AND ${PERSONAL_WHERE}`).all();
  const tagCount = {};
  tagItems.forEach(item => {
    JSON.parse(item.tags).forEach(tag => {
      tag.split('/').map(t => t.trim()).filter(Boolean).forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
  });
  const tagPreference = Object.entries(tagCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = db.prepare(`SELECT COUNT(*) AS count FROM items WHERE ${PERSONAL_WHERE}`).get();
  const byType = db.prepare(`SELECT type, COUNT(*) AS count FROM items WHERE ${PERSONAL_WHERE} GROUP BY type`).all();
  const avgRating = db.prepare(`SELECT ROUND(AVG(rating), 1) AS avg FROM items WHERE rating IS NOT NULL AND ${PERSONAL_WHERE}`).get();
  const topRated = db.prepare(`SELECT name, rating AS score, type FROM items WHERE rating IS NOT NULL AND ${PERSONAL_WHERE} ORDER BY rating DESC LIMIT 5`).all();
  const watched = db.prepare(`SELECT COUNT(*) AS count FROM items WHERE watched = 1`).get();
  const wantWatch = db.prepare(`SELECT COUNT(*) AS count FROM items WHERE watch_progress = '想看'`).get();
  const watching = db.prepare(`SELECT COUNT(*) AS count FROM items WHERE watch_progress = '在看'`).get();

  // 🆕 观看进度分布
  const progressDistribution = db.prepare(`
    SELECT watch_progress AS name, COUNT(*) AS value
    FROM items WHERE ${PERSONAL_WHERE} AND watch_progress != ''
    GROUP BY watch_progress
  `).all();
  // 补充已看但未设进度的
  const watchedNoProgress = db.prepare(
    `SELECT COUNT(*) AS cnt FROM items WHERE watched = 1 AND watch_progress = ''`
  ).get().cnt;
  if (watchedNoProgress > 0) {
    progressDistribution.push({ name: '已看(无进度)', value: watchedNoProgress });
  }

  // 🆕 我的评分 vs 豆瓣评分（散点图数据）
  const userVsDouban = db.prepare(`
    SELECT name, rating AS user_rating, douban_rating
    FROM items WHERE rating IS NOT NULL AND douban_rating IS NOT NULL AND ${PERSONAL_WHERE}
    LIMIT 100
  `).all();

  // 🆕 观影年份分布
  const yearDistribution = db.prepare(`
    SELECT year, COUNT(*) AS count
    FROM items WHERE year IS NOT NULL AND ${PERSONAL_WHERE}
    GROUP BY year ORDER BY year
  `).all();

  // 🆕 地区分布（拆分 "/"）
  const regionRows = db.prepare(
    `SELECT regions FROM items WHERE regions != '' AND ${PERSONAL_WHERE}`
  ).all();
  const regionCount = {};
  regionRows.forEach(row => {
    (row.regions || '').split('/').map(s => s.trim()).filter(Boolean).forEach(r => {
      regionCount[r] = (regionCount[r] || 0) + 1;
    });
  });
  const regionDistribution = Object.entries(regionCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // 🆕 演员偏好 Top 15
  const actorRows = db.prepare(
    `SELECT actors, rating FROM items WHERE actors != '' AND rating IS NOT NULL AND ${PERSONAL_WHERE}`
  ).all();
  const actorMap = {};
  actorRows.forEach(row => {
    (row.actors || '').split(',').map(s => s.trim()).filter(Boolean).forEach(a => {
      if (!actorMap[a]) actorMap[a] = [];
      actorMap[a].push(row.rating);
    });
  });
  const actorPreference = Object.entries(actorMap)
    .map(([name, scores]) => ({
      name,
      avg_rating: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      count: scores.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  // 🆕 评分档位统计（高/中/低）
  const ratingTiers = {
    high: db.prepare(`SELECT COUNT(*) AS cnt FROM items WHERE rating >= 8 AND ${PERSONAL_WHERE}`).get().cnt,
    mid: db.prepare(`SELECT COUNT(*) AS cnt FROM items WHERE rating >= 5 AND rating <= 7 AND ${PERSONAL_WHERE}`).get().cnt,
    low: db.prepare(`SELECT COUNT(*) AS cnt FROM items WHERE rating >= 1 AND rating <= 4 AND ${PERSONAL_WHERE}`).get().cnt,
  };

  res.json({
    ratingDistribution: ratingDist,
    avgByCategory,
    avgByDirector,
    avgByYear,
    timeline,
    tagPreference,
    progressDistribution,
    userVsDouban,
    yearDistribution,
    regionDistribution,
    actorPreference,
    ratingTiers,
    summary: {
      total: total.count,
      watched: watched.count,
      wantWatch: wantWatch.count,
      watching: watching.count,
      byType,
      avgRating: avgRating.avg,
      topRated: topRated.map(t => ({ name: t.name, rating: t.score, type: t.type })),
    },
  });
});

module.exports = router;
