const path = require("path");
const { Database } = require("node-sqlite3-wasm");

const DB_PATH = path.join(__dirname, "../data/blog.db");
let _db = null;

function getDb() {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA synchronous = NORMAL");
  initSchema(_db);
  return _db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      title    TEXT NOT NULL,
      body     TEXT NOT NULL,
      mood     TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_blog_created_at ON blog_posts(created_at);
  `);
}

function getAllPosts(db) {
  return db.prepare("SELECT * FROM blog_posts ORDER BY created_at DESC").all([]);
}

function getPost(db, id) {
  return db.prepare("SELECT * FROM blog_posts WHERE id = ?").get([id]);
}

function createPost(db, { title, body, mood }) {
  const result = db
    .prepare("INSERT INTO blog_posts (title, body, mood) VALUES (?, ?, ?)")
    .run([title, body, mood || null]);
  return getPost(db, result.lastInsertRowid);
}

function updatePost(db, id, { title, body, mood }) {
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE blog_posts SET title = ?, body = ?, mood = ?, updated_at = ? WHERE id = ?"
  ).run([title, body, mood || null, now, id]);
  return getPost(db, id);
}

function deletePost(db, id) {
  db.prepare("DELETE FROM blog_posts WHERE id = ?").run([id]);
}

module.exports = { getDb, getAllPosts, getPost, createPost, updatePost, deletePost };
