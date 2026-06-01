const express = require('express');
const cors = require('cors');
const itemsRouter = require('./routes/items');
const analyticsRouter = require('./routes/analytics');
const listsRouter = require('./routes/lists');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/items', itemsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/lists', listsRouter);

// 图片代理：绕过豆瓣等网站的 Referer 防盗链
app.get('/api/proxy-image', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://movie.douban.com/',
      },
    });
    if (!resp.ok) return res.status(resp.status).end();
    res.set('Content-Type', resp.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    const buffer = await resp.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(502).end();
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 阻止进程在 Express 5 下过早退出
server.keepAliveTimeout = 0;
process.stdin.resume();
