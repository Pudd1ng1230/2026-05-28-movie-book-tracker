/**
 * 简介爬虫（纯 HTTP 版，无需 Puppeteer）
 * 前提：已从 Edge 导出 Cookie 并保存到 douban-cookies.json
 *
 * Cookie 获取方法：
 *   1. Edge 打开 movie.douban.com 并登录
 *   2. F12 → Console → 粘贴执行：
 *      copy(JSON.stringify(document.cookie.split('; ').map(c => {
 *        const [n, ...r] = c.split('='); return { name: n, value: r.join('='), domain: '.douban.com' }
 *      })))
 *   3. 粘贴到新建文件 server/douban-cookies.json
 *
 * 用法: node server/scrape-summaries-only.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const COOKIE_FILE = path.join(__dirname, 'douban-cookies.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!fs.existsSync(COOKIE_FILE)) {
    console.log('❌ 找不到 douban-cookies.json，请先从 Edge 导出 Cookie！');
    console.log('   1. Edge 打开 movie.douban.com 并登录');
    console.log('   2. F12 → Console → 粘贴执行导出脚本');
    console.log('   3. 保存到 server/douban-cookies.json');
    process.exit(1);
  }

  const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
  const jar = cookies.map(c => `${c.name}=${c.value}`).join('; ');

  const headers = {
    'User-Agent': UA,
    Cookie: jar,
    Referer: 'https://movie.douban.com/',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };

  // 测试 Cookie
  console.log('测试 Cookie...');
  try {
    const test = await axios.get('https://movie.douban.com/subject/1294979/', { headers, timeout: 10000 });
    if (!test.data.includes('v:summary') && !test.data.includes('link-report')) {
      console.log('❌ Cookie 无效或已过期，请重新导出');
      process.exit(1);
    }
    console.log('✅ Cookie 有效\n');
  } catch (e) {
    console.log('❌ Cookie 无效:', e.message);
    process.exit(1);
  }

  const movies = db.prepare(
    "SELECT id, douban_id, name FROM items WHERE type = 'movie' AND douban_id IS NOT NULL AND (summary IS NULL OR summary = '')"
  ).all();

  console.log(`需要简介: ${movies.length} 部\n`);

  let updated = 0, failed = 0, totalFail = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    try {
      const res = await axios.get(`https://movie.douban.com/subject/${m.douban_id}/`, { headers, timeout: 10000 });
      const html = res.data;

      let summary = '';
      const m1 = html.match(/<span\s+property="v:summary"[^>]*>([\s\S]*?)<\/span>/i);
      if (m1) summary = m1[1];
      if (!summary) {
        const m2 = html.match(/id="link-report"[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
        if (m2) summary = m2[1];
      }

      if (summary) {
        const clean = summary.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
        if (clean.length > 10) {
          db.prepare('UPDATE items SET summary = ? WHERE id = ?').run(clean, m.id);
          updated++;
          totalFail = 0;
        } else { failed++; totalFail++; }
      } else { failed++; totalFail++; }
    } catch (e) {
      failed++; totalFail++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  📊 ${i + 1}/${movies.length} | ✅ ${updated} | ❌ ${failed}`);
    }

    // 连续 30 次失败 → Cookie 过期
    if (totalFail >= 30) {
      console.log('\n⚠️ 连续失败 30 次，Cookie 可能已过期');
      break;
    }

    await sleep(500);
  }

  console.log(`\n═══ 完成 ═══`);
  console.log(`已更新: ${updated} | 失败: ${failed}`);
  db.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
