/**
 * 豆瓣电影简介爬虫
 * 从 movie.douban.com/subject/{id}/ 页面提取简介，更新已有电影
 *
 * 用法: node server/scrape-summaries.js
 */

const axios = require('axios');
const db = require('./db');

const CONFIG = {
  delay: 500,       // 请求间隔 ms
  batchSize: 50,    // 每爬多少部打印一次进度
  ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const headers = {
  'User-Agent': CONFIG.ua,
  Referer: 'https://movie.douban.com/',
  'Accept-Language': 'zh-CN,zh;q=0.9',
};

async function fetchSummary(doubanId) {
  try {
    const res = await axios.get(`https://movie.douban.com/subject/${doubanId}/`, {
      headers,
      timeout: 10000,
    });
    const html = res.data;

    // 提取 <span property="v:summary" class=""> ... </span>
    const m = html.match(/<span\s+property="v:summary"[^>]*>([\s\S]*?)<\/span>/i);
    if (m) {
      return m[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // 备选：提取 <div class="intro"> 内的 <p>
    const m2 = html.match(/<div\s+class="intro"\s+id="link-report"[^>]*>([\s\S]*?)<\/div>/i);
    if (m2) {
      return m2[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return null;
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('═══ 豆瓣简介爬虫启动 ═══');

  // 找出所有没有简介的电影
  const movies = db.prepare(
    "SELECT id, douban_id, name, summary FROM items WHERE type = 'movie' AND douban_id IS NOT NULL"
  ).all();

  const needSummary = movies.filter(m => !m.summary || m.summary.trim() === '');
  console.log(`总电影: ${movies.length} | 需要简介: ${needSummary.length}`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < needSummary.length; i++) {
    const movie = needSummary[i];

    await sleep(CONFIG.delay);
    const summary = await fetchSummary(movie.douban_id);

    if (summary && summary.length > 10) {
      db.prepare('UPDATE items SET summary = ? WHERE id = ?').run(summary, movie.id);
      updated++;
    } else {
      failed++;
    }

    if ((i + 1) % CONFIG.batchSize === 0) {
      console.log(`  进度: ${i + 1}/${needSummary.length} | 已更新: ${updated} | 失败: ${failed}`);
    }
  }

  console.log('');
  console.log('═══ 完成 ═══');
  console.log(`已更新: ${updated} | 失败/无简介: ${failed}`);
}

main().catch((err) => {
  console.error('异常:', err);
  process.exit(1);
});
