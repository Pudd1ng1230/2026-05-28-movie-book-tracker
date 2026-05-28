const express = require('express');
const cors = require('cors');
const itemsRouter = require('./routes/items');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/items', itemsRouter);
app.use('/api/analytics', analyticsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
