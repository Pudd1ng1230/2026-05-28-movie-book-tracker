const express = require('express');
const db = require('../db');
const router = express.Router();

// ── 工具函数 ───────────────────────────────────────────

// 拆分多值字段并独立聚合（如 category="动作/科幻" → "动作" 和 "科幻" 各自统计）
function splitAggregate(rows, field, delimiter, scoreField) {
  const map = {};
  rows.forEach(row => {
    const score = row[scoreField];
    if (score == null) return;
    const raw = (row[field] || '').trim();
    if (!raw) return;
    raw.split(delimiter).map(s => s.trim()).filter(Boolean).forEach(part => {
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

// 标签偏好统计（拆分 JSON 数组 + "/"）
function computeTagPreference(extraWhere = '') {
  const where = `tags != '[]'${extraWhere ? ` AND ${extraWhere}` : ''}`;
  const items = db.prepare(`SELECT tags FROM items WHERE ${where}`).all();
  const tagCount = {};
  items.forEach(item => {
    JSON.parse(item.tags).forEach(tag => {
      tag.split('/').map(t => t.trim()).filter(Boolean).forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
      });
    });
  });
  return Object.entries(tagCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ── 共享查询函数（消除 /all、/personal/all、独立端点之间的重复） ──

function getRatingDistribution(scoreField, extraWhere = '') {
  const where = `${scoreField} IS NOT NULL${extraWhere ? ` AND ${extraWhere}` : ''}`;
  return db.prepare(`
    SELECT CASE
      WHEN ${scoreField} BETWEEN 1 AND 2 THEN '1-2'
      WHEN ${scoreField} BETWEEN 3 AND 4 THEN '3-4'
      WHEN ${scoreField} BETWEEN 5 AND 6 THEN '5-6'
      WHEN ${scoreField} BETWEEN 7 AND 8 THEN '7-8'
      WHEN ${scoreField} BETWEEN 9 AND 10 THEN '9-10'
    END AS bucket, COUNT(*) AS count
    FROM items WHERE ${where}
    GROUP BY bucket ORDER BY bucket
  `).all();
}

function getCategoryStats(scoreField, extraWhere = '') {
  const where = `${scoreField} IS NOT NULL AND category != ''${extraWhere ? ` AND ${extraWhere}` : ''}`;
  const rows = db.prepare(`SELECT category, ${scoreField} AS score FROM items WHERE ${where}`).all();
  return splitAggregate(rows, 'category', '/', 'score');
}

function getDirectorStats(scoreField, extraWhere = '') {
  const where = `${scoreField} IS NOT NULL AND director != ''${extraWhere ? ` AND ${extraWhere}` : ''}`;
  const rows = db.prepare(`SELECT director, ${scoreField} AS score FROM items WHERE ${where}`).all();
  return splitAggregate(rows, 'director', ', ', 'score').slice(0, 10);
}

function getYearStats(scoreField, extraWhere = '') {
  const where = `${scoreField} IS NOT NULL AND year IS NOT NULL${extraWhere ? ` AND ${extraWhere}` : ''}`;
  return db.prepare(`
    SELECT year, ROUND(AVG(${scoreField}), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE ${where}
    GROUP BY year ORDER BY year
  `).all();
}

function getTimeline(extraWhere = '') {
  const where = `date != ''${extraWhere ? ` AND ${extraWhere}` : ''}`;
  return db.prepare(`
    SELECT substr(date, 1, 7) AS month, COUNT(*) AS count
    FROM items WHERE ${where}
    GROUP BY month ORDER BY month
  `).all();
}

function getSummary(scoreField, extraWhere = '') {
  const where = extraWhere ? `WHERE ${extraWhere}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS count FROM items ${where}`).get();
  const byType = db.prepare(`SELECT type, COUNT(*) AS count FROM items ${where} GROUP BY type`).all();
  const whereWithScore = `${scoreField} IS NOT NULL${extraWhere ? ` AND ${extraWhere}` : ''}`;
  const avgRating = db.prepare(`SELECT ROUND(AVG(${scoreField}), 1) AS avg FROM items WHERE ${whereWithScore}`).get();
  const topRated = db.prepare(`SELECT name, ${scoreField} AS score, type FROM items WHERE ${whereWithScore} ORDER BY ${scoreField} DESC LIMIT 5`).all();
  return {
    total: total.count,
    byType,
    avgRating: avgRating.avg,
    topRated: topRated.map(t => ({ name: t.name, rating: t.score, type: t.type })),
  };
}

// ── 评分字段选择 ──
// 全站：优先豆瓣评分；个人：用户自己的评分
const ALL_SCORE = 'COALESCE(douban_rating, rating)';
const PERSONAL_SCORE = 'rating';
const PERSONAL_WHERE = `(watched = 1 OR rating IS NOT NULL OR review != '' OR watch_progress != '')`;

// ── 独立端点（复用共享查询函数） ──

router.get('/rating-distribution', (_req, res) => {
  res.json(getRatingDistribution(ALL_SCORE));
});

router.get('/avg-by-category', (_req, res) => {
  res.json(getCategoryStats(ALL_SCORE));
});

router.get('/avg-by-director', (_req, res) => {
  res.json(getDirectorStats(ALL_SCORE));
});

router.get('/avg-by-year', (_req, res) => {
  res.json(getYearStats(ALL_SCORE));
});

router.get('/timeline', (_req, res) => {
  res.json(getTimeline());
});

router.get('/tag-preference', (_req, res) => {
  res.json(computeTagPreference());
});

router.get('/summary', (_req, res) => {
  res.json(getSummary(ALL_SCORE));
});

// ── 全站分析（聚合端点） ──
router.get('/all', (_req, res) => {
  res.json({
    ratingDistribution: getRatingDistribution(ALL_SCORE),
    avgByCategory:      getCategoryStats(ALL_SCORE),
    avgByDirector:      getDirectorStats(ALL_SCORE),
    avgByYear:          getYearStats(ALL_SCORE),
    timeline:           getTimeline(),
    tagPreference:      computeTagPreference(),
    summary:            getSummary(ALL_SCORE),
  });
});

// ── 个人分析 ──
router.get('/personal/all', (_req, res) => {
  const ratingDist    = getRatingDistribution(PERSONAL_SCORE, PERSONAL_WHERE);
  const avgByCategory = getCategoryStats(PERSONAL_SCORE, PERSONAL_WHERE);
  const avgByDirector = getDirectorStats(PERSONAL_SCORE, PERSONAL_WHERE);
  const avgByYear     = getYearStats(PERSONAL_SCORE, PERSONAL_WHERE);
  const timeline      = getTimeline(PERSONAL_WHERE);
  const tagPreference = computeTagPreference(PERSONAL_WHERE);
  const summary       = getSummary(PERSONAL_SCORE, PERSONAL_WHERE);

  const watched    = db.prepare('SELECT COUNT(*) AS count FROM items WHERE watched = 1').get();
  const wantWatch  = db.prepare("SELECT COUNT(*) AS count FROM items WHERE watch_progress = '想看'").get();
  const watching   = db.prepare("SELECT COUNT(*) AS count FROM items WHERE watch_progress = '在看'").get();

  // 观看进度分布
  const progressDistribution = db.prepare(`
    SELECT watch_progress AS name, COUNT(*) AS value
    FROM items WHERE ${PERSONAL_WHERE} AND watch_progress != ''
    GROUP BY watch_progress
  `).all();
  const watchedNoProgress = db.prepare(
    "SELECT COUNT(*) AS cnt FROM items WHERE watched = 1 AND watch_progress = ''"
  ).get().cnt;
  if (watchedNoProgress > 0) {
    progressDistribution.push({ name: '已看(无进度)', value: watchedNoProgress });
  }

  // 我的评分 vs 豆瓣评分（散点图）
  const userVsDouban = db.prepare(`
    SELECT name, rating AS user_rating, douban_rating
    FROM items WHERE rating IS NOT NULL AND douban_rating IS NOT NULL AND ${PERSONAL_WHERE}
    LIMIT 100
  `).all();

  // 观影年份分布
  const yearDistribution = db.prepare(`
    SELECT year, COUNT(*) AS count
    FROM items WHERE year IS NOT NULL AND ${PERSONAL_WHERE}
    GROUP BY year ORDER BY year
  `).all();

  // 地区分布
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

  // 演员偏好 Top 15
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

  // 评分档位
  const ratingTiers = {
    high: db.prepare(`SELECT COUNT(*) AS cnt FROM items WHERE rating >= 8 AND ${PERSONAL_WHERE}`).get().cnt,
    mid:  db.prepare(`SELECT COUNT(*) AS cnt FROM items WHERE rating >= 5 AND rating <= 7 AND ${PERSONAL_WHERE}`).get().cnt,
    low:  db.prepare(`SELECT COUNT(*) AS cnt FROM items WHERE rating >= 1 AND rating <= 4 AND ${PERSONAL_WHERE}`).get().cnt,
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
      ...summary,
      watched: watched.count,
      wantWatch: wantWatch.count,
      watching: watching.count,
    },
  });
});

module.exports = router;
