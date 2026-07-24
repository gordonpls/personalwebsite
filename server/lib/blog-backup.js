const fs = require("fs");
const path = require("path");

// Durable, human-readable backups of the journal. Two artifacts, both living in
// server/data/ (which the deploy is configured to never overwrite):
//   - blog-export.json : always-current full dump of every post. Because each
//     write rewrites the complete set, the latest export alone contains the
//     entire surviving history — nothing is ever lost to pruning.
//   - blog-backups/blog-<timestamp>.json : rolling point-in-time snapshots for
//     recovering a prior version (e.g. after an accidental edit/delete). Capped
//     at KEEP files; pruning is safe since every snapshot is itself complete.
const DATA_DIR = path.join(__dirname, "../data");
const BACKUP_DIR = path.join(DATA_DIR, "blog-backups");
const EXPORT_FILE = path.join(DATA_DIR, "blog-export.json");
const KEEP = 60;

function buildPayload(posts) {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), count: posts.length, posts },
    null,
    2,
  );
}

// Write the current export + a timestamped snapshot. Never throws — a backup
// failure must not break the write it is protecting.
function snapshot(posts) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const payload = buildPayload(posts);
    fs.writeFileSync(EXPORT_FILE, payload);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    fs.writeFileSync(path.join(BACKUP_DIR, `blog-${ts}.json`), payload);
    prune();
  } catch (e) {
    console.error("blog backup: snapshot failed:", e && e.message);
  }
}

function prune() {
  try {
    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith("blog-") && f.endsWith(".json"))
      .sort();
    for (const f of files.slice(0, Math.max(0, files.length - KEEP))) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    }
  } catch (e) {
    console.error("blog backup: prune failed:", e && e.message);
  }
}

module.exports = { snapshot, buildPayload, EXPORT_FILE };
