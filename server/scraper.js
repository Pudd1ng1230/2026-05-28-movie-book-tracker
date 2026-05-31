/**
 * 豆瓣电影爬虫 v2
 * 使用 /j/search_subjects 获取列表 + /j/subject_abstract 获取详情
 *
 * 用法: node server/scraper.js
 */

const axios = require('axios');
const db = require('./db');

// ─── 配置 ───────────────────────────────────────────
const CONFIG = {
  tags: [
    '热门',
    '豆瓣高分',
    '华语',
    '欧美',
    '日本',
    '韩国',
    '动作',
    '喜剧',
    '爱情',
    '科幻',
    '悬疑',
    '剧情',
    '动画',
    '纪录片',
    '冷门佳片',
  ],
  maxPages: 10,          // 每个标签最多抓 10 页
  pageSize: 20,          // 每页 20 部（API 稳定值）
  listDelay: 1000,       // 列表请求间隔 ms
  detailDelay: 600,      // 详情请求间隔 ms
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const headers = {
  'User-Agent': CONFIG.ua,
  Referer: 'https://movie.douban.com/',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

// ─── 获取电影列表 ──────────────────────────────────
async function fetchMovieList(tag, start) {
  const params = {
    type: 'movie',
    tag: tag || '热门',
    page_limit: CONFIG.pageSize,
    page_start: start,
  };
  try {
    const res = await axios.get('https://movie.douban.com/j/search_subjects', {
      params,
      headers,
      timeout: 15000,
    });
    return res.data.subjects || [];
  } catch (err) {
    console.error(`  [list] ${tag} p${start / CONFIG.pageSize}: ${err.message}`);
    return [];
  }
}

// ─── 获取电影详情 ──────────────────────────────────
async function fetchMovieDetail(doubanId) {
  try {
    const res = await axios.get('https://movie.douban.com/j/subject_abstract', {
      params: { subject_id: doubanId },
      headers,
      timeout: 15000,
    });
    const s = res.data.subject;
    if (!s || res.data.r !== 0) return null;

    // 从 title 中提取年份（格式: "肖申克的救赎 The Shawshank Redemption‎ (1994)"）
    let name = s.title || '';
    let year = s.release_year || null;
    if (!year) {
      const m = name.match(/\((\d{4})\)/);
      if (m) year = parseInt(m[1], 10);
    }
    // 清理名称中的英文和年份
    name = name.replace(/\s*\(?\d{4}\)?\s*$/, '').replace(/\s*\u200e.*$/, '').trim();

    return {
      name,
      douban_id: doubanId,
      douban_rating: s.rate ? parseFloat(s.rate) : null,
      year,
      director: (s.directors || []).join(', '),
      category: (s.types || []).join('/'),
      poster: '',  // 由搜索 API 补充
      summary: '',
      actors: (s.actors || []).slice(0, 5).join(', '),
      regions: s.region || '',
      languages: '',
      douban_votes: null,  // 此 API 不返回投票数
    };
  } catch (err) {
    console.error(`  [detail] ${doubanId}: ${err.message}`);
    return null;
  }
}

// ─── 写入数据库 ────────────────────────────────────
function upsertMovie(movie, posterUrl) {
  if (!movie || !movie.douban_id) return false;

  const existing = db.prepare('SELECT id FROM items WHERE douban_id = ?').get(movie.douban_id);
  if (existing) {
    db.prepare(`
      UPDATE items SET
        douban_rating = COALESCE(?, douban_rating),
        year = COALESCE(?, year),
        director = CASE WHEN ? != '' THEN ? ELSE director END,
        category = CASE WHEN ? != '' THEN ? ELSE category END,
        actors = ?, regions = ?,
        poster = CASE WHEN ? != '' THEN ? ELSE poster END
      WHERE douban_id = ?
    `).run(
      movie.douban_rating, movie.year,
      movie.director, movie.director,
      movie.category, movie.category,
      movie.actors, movie.regions,
      posterUrl, posterUrl,
      movie.douban_id,
    );
    return false;
  }

  db.prepare(`
    INSERT INTO items (name, type, category, director, year, rating,
      poster, summary, douban_id, douban_rating, douban_votes,
      regions, languages, actors)
    VALUES (?, 'movie', ?, ?, ?, NULL, ?, '', ?, ?, NULL, ?, '', ?)
  `).run(
    movie.name,
    movie.category || '',
    movie.director || '',
    movie.year || null,
    posterUrl || '',
    movie.douban_id,
    movie.douban_rating || null,
    movie.regions || '',
    movie.actors || '',
  );
  return true;
}

// ─── 主流程 ─────────────────────────────────────────
async function main() {
  console.log('═══ 豆瓣电影爬虫 v2 启动 ═══');
  console.log(`标签: ${CONFIG.tags.length} | 每标签 ${CONFIG.maxPages} 页 × ${CONFIG.pageSize} 部`);
  console.log('');

  const seen = new Set();
  let added = 0;
  let skipped = 0;
  let detailFailures = 0;
  const MAX_DETAIL_FAILURES = 30; // 连续失败上限

  for (const tag of CONFIG.tags) {
    for (let page = 0; page < CONFIG.maxPages; page++) {
      if (detailFailures >= MAX_DETAIL_FAILURES) {
        console.log('  ⚠ 详情请求连续失败过多，停止爬取（可能被限流）');
        break;
      }

      const start = page * CONFIG.pageSize;
      const subjects = await fetchMovieList(tag, start);

      if (subjects.length === 0) {
        console.log(`  [list] ${tag} p${page}: 无结果，翻页结束`);
        break;
      }

      console.log(`  [list] ${tag} p${page}: ${subjects.length} 部`);

        for (const subj of subjects) {
          if (seen.has(subj.id)) { skipped++; continue; }
          seen.add(subj.id);

          // 检查数据库是否已有完整记录
          const cached = db.prepare(
            'SELECT id, douban_rating, director FROM items WHERE douban_id = ?'
          ).get(subj.id);
          if (cached && cached.douban_rating && cached.director) {
            skipped++;
            continue;
          }

          await sleep(CONFIG.detailDelay);
          const detail = await fetchMovieDetail(subj.id);

          if (detail) {
            detailFailures = 0; // 重置失败计数

            // 补充海报（来自搜索 API 的 cover 字段）
            const posterUrl = subj.cover || '';

            const isNew = upsertMovie(detail, posterUrl);
            if (isNew) {
              added++;
              console.log(`  ✓ #${added}: ${detail.name} (${detail.year}) ★${detail.douban_rating} [${detail.category}]`);
            } else {
              skipped++;
            }
          } else {
            detailFailures++;
          }
        }

        await sleep(CONFIG.listDelay);
    }
    if (detailFailures >= MAX_DETAIL_FAILURES) break;
  }

  console.log('');
  console.log('═══ 爬取完成 ═══');
  console.log(`新增: ${added} | 跳过: ${skipped} | 详情失败: ${detailFailures}`);
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM items WHERE type = ?').get('movie');
  console.log(`数据库电影总数: ${total.cnt}`);

  // 清理之前爬虫产生的无效记录（名称为 "豆瓣" 的）
  const cleaned = db.prepare("DELETE FROM items WHERE type = 'movie' AND name = '豆瓣'").run();
  if (cleaned.changes > 0) console.log(`清理无效记录: ${cleaned.changes} 条`);
}

main().catch((err) => {
  console.error('爬虫异常退出:', err);
  process.exit(1);
});
