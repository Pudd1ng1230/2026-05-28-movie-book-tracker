const express = require('express');
const db = require('../db');
const router = express.Router();

// Rating distribution (histogram buckets: 1-2, 3-4, 5-6, 7-8, 9-10)
router.get('/rating-distribution', (req, res) => {
  const rows = db.prepare(`
    SELECT
      CASE
        WHEN rating BETWEEN 1 AND 2 THEN '1-2'
        WHEN rating BETWEEN 3 AND 4 THEN '3-4'
        WHEN rating BETWEEN 5 AND 6 THEN '5-6'
        WHEN rating BETWEEN 7 AND 8 THEN '7-8'
        WHEN rating BETWEEN 9 AND 10 THEN '9-10'
      END AS bucket,
      COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL
    GROUP BY bucket ORDER BY bucket
  `).all();
  res.json(rows);
});

// Average rating by category
router.get('/avg-by-category', (req, res) => {
  const rows = db.prepare(`
    SELECT category, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND category != ''
    GROUP BY category ORDER BY avg_rating DESC
  `).all();
  res.json(rows);
});

// Average rating by director
router.get('/avg-by-director', (req, res) => {
  const rows = db.prepare(`
    SELECT director, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND director != ''
    GROUP BY director ORDER BY avg_rating DESC LIMIT 10
  `).all();
  res.json(rows);
});

// Average rating by year
router.get('/avg-by-year', (req, res) => {
  const rows = db.prepare(`
    SELECT year, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND year IS NOT NULL
    GROUP BY year ORDER BY year
  `).all();
  res.json(rows);
});

// Viewing timeline (count by month)
router.get('/timeline', (req, res) => {
  const rows = db.prepare(`
    SELECT substr(date, 1, 7) AS month, COUNT(*) AS count
    FROM items WHERE date != ''
    GROUP BY month ORDER BY month
  `).all();
  res.json(rows);
});

// Tag preference (radar)
router.get('/tag-preference', (req, res) => {
  const items = db.prepare("SELECT tags FROM items WHERE tags != '[]'").all();
  const tagCount = {};
  items.forEach(item => {
    const tags = JSON.parse(item.tags);
    tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  const result = Object.entries(tagCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  res.json(result);
});

// Summary stats
router.get('/summary', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS count FROM items').get();
  const byType = db.prepare('SELECT type, COUNT(*) AS count FROM items GROUP BY type').all();
  const avgRating = db.prepare('SELECT ROUND(AVG(rating), 1) AS avg FROM items WHERE rating IS NOT NULL').get();
  const topRated = db.prepare('SELECT name, rating, type FROM items WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 5').all();

  res.json({ total: total.count, byType, avgRating: avgRating.avg, topRated });
});

// All analytics in one call
router.get('/all', (req, res) => {
  const ratingDist = db.prepare(`
    SELECT CASE
      WHEN rating BETWEEN 1 AND 2 THEN '1-2'
      WHEN rating BETWEEN 3 AND 4 THEN '3-4'
      WHEN rating BETWEEN 5 AND 6 THEN '5-6'
      WHEN rating BETWEEN 7 AND 8 THEN '7-8'
      WHEN rating BETWEEN 9 AND 10 THEN '9-10'
    END AS bucket, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL
    GROUP BY bucket ORDER BY bucket
  `).all();

  const avgByCategory = db.prepare(`
    SELECT category, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND category != ''
    GROUP BY category ORDER BY avg_rating DESC
  `).all();

  const avgByDirector = db.prepare(`
    SELECT director, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND director != ''
    GROUP BY director ORDER BY avg_rating DESC LIMIT 10
  `).all();

  const avgByYear = db.prepare(`
    SELECT year, ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS count
    FROM items WHERE rating IS NOT NULL AND year IS NOT NULL
    GROUP BY year ORDER BY year
  `).all();

  const timeline = db.prepare(`
    SELECT substr(date, 1, 7) AS month, COUNT(*) AS count
    FROM items WHERE date != ''
    GROUP BY month ORDER BY month
  `).all();

  const items = db.prepare("SELECT tags FROM items WHERE tags != '[]'").all();
  const tagCount = {};
  items.forEach(item => {
    JSON.parse(item.tags).forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });
  const tagPreference = Object.entries(tagCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = db.prepare('SELECT COUNT(*) AS count FROM items').get();
  const byType = db.prepare('SELECT type, COUNT(*) AS count FROM items GROUP BY type').all();
  const avgRating = db.prepare('SELECT ROUND(AVG(rating), 1) AS avg FROM items WHERE rating IS NOT NULL').get();
  const topRated = db.prepare('SELECT name, rating, type FROM items WHERE rating IS NOT NULL ORDER BY rating DESC LIMIT 5').all();

  res.json({
    ratingDistribution: ratingDist,
    avgByCategory,
    avgByDirector,
    avgByYear,
    timeline,
    tagPreference,
    summary: { total: total.count, byType, avgRating: avgRating.avg, topRated },
  });
});

module.exports = router;
