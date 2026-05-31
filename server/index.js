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

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// 阻止进程在 Express 5 下过早退出
server.keepAliveTimeout = 0;
process.stdin.resume();
