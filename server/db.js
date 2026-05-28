const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('movie', 'tv', 'book')),
    category TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    director TEXT DEFAULT '',
    year INTEGER,
    rating INTEGER CHECK(rating >= 1 AND rating <= 10),
    review TEXT DEFAULT '',
    date TEXT DEFAULT '',
    poster TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
