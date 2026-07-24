const fs = require("fs");
const path = require("path");
const { Database } = require("node-sqlite3-wasm");

// node-sqlite3-wasm locks a database by mkdir-ing `${dbPath}.lock` and unlocks
// it by rmdir. That mutex does NOT survive process death: if the app is killed
// while a lock is held (SIGKILL, a crash, an ungraceful Passenger restart), the
// `.lock` directory leaks and EVERY subsequent open throws "database is locked"
// forever — a fresh process can't tell the stale lock from a live one, so it
// never removes it. This module makes opening resilient:
//   1. Clear a demonstrably-stale `.lock` before opening.
//   2. Close every DB gracefully on shutdown so locks are released cleanly and
//      the stale-lock situation is avoided in the first place.
//
// In normal operation a lock is held only for the microseconds of a single
// statement, so a `.lock` directory older than a few seconds is definitively
// stale (never an active concurrent writer).
const STALE_LOCK_MS = 5000;

function clearStaleLock(dbPath) {
  const lockDir = `${dbPath}.lock`;
  try {
    const st = fs.statSync(lockDir);
    if (Date.now() - st.mtimeMs >= STALE_LOCK_MS) {
      fs.rmdirSync(lockDir);
      console.warn(`sqlite: cleared stale lock ${lockDir}`);
    }
  } catch (e) {
    if (e.code !== "ENOENT") console.warn(`sqlite: lock check failed for ${lockDir}:`, e.message);
  }
}

const _open = new Set();
let _hooked = false;

function installShutdownHook() {
  if (_hooked) return;
  _hooked = true;
  const closeAll = () => {
    for (const db of _open) {
      try { db.close(); } catch { /* already closed / mid-op — best effort */ }
    }
    _open.clear();
  };
  // `exit` can only run sync work; db.close() is synchronous (WASM), so this is
  // the reliable last line of defense.
  process.once("exit", closeAll);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.once(sig, () => {
      closeAll();
      process.exit(0);
    });
  }
}

// Open (or create) a SQLite database with stale-lock recovery, the data dir
// ensured, pragmas applied, and graceful-close registered.
function openDatabase(dbPath, { journalMode = "WAL", synchronous = "NORMAL" } = {}) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  clearStaleLock(dbPath);
  const db = new Database(dbPath);
  try {
    // The mkdir-based VFS lock is taken for any access (even reads), so with
    // multiple Passenger workers a simultaneous request can momentarily collide.
    // busy_timeout makes SQLite retry acquiring the lock for a window instead of
    // failing instantly with SQLITE_BUSY — the held lock only lasts a statement.
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec(`PRAGMA journal_mode = ${journalMode}`);
    db.exec(`PRAGMA synchronous = ${synchronous}`);
  } catch (e) {
    // The WASM build may not support every pragma; non-fatal.
    console.warn(`sqlite: pragma setup skipped for ${dbPath}:`, e.message);
  }
  _open.add(db);
  installShutdownHook();
  return db;
}

module.exports = { openDatabase, clearStaleLock };
