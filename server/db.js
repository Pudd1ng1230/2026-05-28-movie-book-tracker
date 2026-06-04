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

// ---- migrations ----
const migrate = (colName, colDef) => {
  const exists = db.prepare(
    "SELECT COUNT(*) AS cnt FROM pragma_table_info('items') WHERE name = ?"
  ).get(colName);
  if (exists && exists.cnt === 0) {
    db.exec(`ALTER TABLE items ADD COLUMN ${colName} ${colDef}`);
    console.log(`[migrate] added column: ${colName}`);
  }
};

migrate('douban_id',      'TEXT');
migrate('douban_rating',  'REAL');
migrate('douban_votes',   'INTEGER');
migrate('regions',        "TEXT DEFAULT ''");
migrate('languages',      "TEXT DEFAULT ''");
migrate('actors',         "TEXT DEFAULT ''");
migrate('watched',        'INTEGER DEFAULT 0');
migrate('watch_progress', "TEXT DEFAULT ''");

// ── 用户自定义清单 ──
db.exec(`
  CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS list_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    watch_progress TEXT DEFAULT '',
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(list_id, item_id)
  )
`);

// ── 索引（幂等：IF NOT EXISTS 保证可重复运行） ──
const indexes = [
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_items_douban_id ON items(douban_id)',
  'CREATE INDEX IF NOT EXISTS idx_items_type ON items(type)',
  'CREATE INDEX IF NOT EXISTS idx_items_watched ON items(watched)',
  'CREATE INDEX IF NOT EXISTS idx_items_douban_rating ON items(douban_rating)',
  'CREATE INDEX IF NOT EXISTS idx_items_rating ON items(rating)',
  'CREATE INDEX IF NOT EXISTS idx_items_year ON items(year)',
  'CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at)',
  'CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items(list_id)',
  'CREATE INDEX IF NOT EXISTS idx_list_items_item ON list_items(item_id)',
];
for (const sql of indexes) {
  try { db.exec(sql); } catch (_) { /* may already exist */ }
}

module.exports = db;
