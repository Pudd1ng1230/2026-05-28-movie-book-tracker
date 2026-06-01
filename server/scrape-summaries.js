/**
 * 豆瓣简介爬虫 v3 — Cookie 登录版
 * 1. 打开豆瓣让用户手动登录 → 保存 Cookie
 * 2. 用 Cookie 批量 HTTP 请求抓简介（极速）
 *
 * 用法: node server/scrape-summaries.js
 */

const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const COOKIE_FILE = path.join(__dirname, 'douban-cookies.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 第一步：登录 ──────────────────────────
async function login() {
  // 如果已有有效 Cookie，直接用
  if (fs.existsSync(COOKIE_FILE)) {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    console.log('已有 Cookie 文件，测试有效性...');
    const ok = await testCookies(cookies);
    if (ok) {
      console.log('Cookie 有效，跳过登录\n');
      return cookies;
    }
    console.log('Cookie 已过期，重新登录\n');
  }

  console.log('正在打开豆瓣...');
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--window-size=1000,700'],
  });

  const page = await browser.newPage();
  await page.setUserAgent(UA);
  // 直接访问豆瓣，会被重定向到登录页
  await page.goto('https://www.douban.com/', { waitUntil: 'networkidle2' });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👉 请在弹出的浏览器中登录豆瓣（60 秒时限）');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 等 60 秒让你登录
  await sleep(60000);

  const cookies = await page.cookies();
  await browser.close();

  fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
  console.log(`Cookie 已保存 (${cookies.length} 条)\n`);
  return cookies;
}

async function testCookies(cookies) {
  try {
    const jar = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const res = await axios.get('https://movie.douban.com/subject/1294979/', {
      headers: { 'User-Agent': UA, Cookie: jar },
      timeout: 10000,
      maxRedirects: 5,
    });
    // 检查是否拿到了真实页面
    return res.data.includes('v:summary') || res.data.includes('link-report');
  } catch {
    return false;
  }
}

// ── 第二步：批量抓取 ──────────────────────
async function scrapeAll(cookies) {
  const jar = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  const headers = {
    'User-Agent': UA,
    Cookie: jar,
    Referer: 'https://movie.douban.com/',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  };

  const movies = db.prepare(
    "SELECT id, douban_id, name FROM items WHERE type = 'movie' AND douban_id IS NOT NULL AND (summary IS NULL OR summary = '')"
  ).all();

  console.log(`需要简介: ${movies.length} 部\n`);

  let updated = 0, failed = 0;

  for (let i = 0; i < movies.length; i++) {
    const m = movies[i];
    try {
      const res = await axios.get(`https://movie.douban.com/subject/${m.douban_id}/`, {
        headers, timeout: 10000,
      });
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
        } else { failed++; }
      } else { failed++; }
    } catch (e) {
      failed++;
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  进度: ${i + 1}/${movies.length} | 已更新: ${updated} | 失败: ${failed}`);
    }

    await sleep(400);
  }

  console.log(`\n═══ 完成 ═══`);
  console.log(`已更新: ${updated} | 失败: ${failed}`);
}

async function main() {
  console.log('═══ 豆瓣简介爬虫 v3 (Cookie 登录版) ═══\n');
  const cookies = await login();
  await scrapeAll(cookies);
  process.exit(0);
}

main().catch((err) => {
  console.error('异常:', err);
  process.exit(1);
});
