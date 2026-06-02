// Plaid Items catalog. Each Plaid Item is one (user, institution) pairing and
// is identified server-side by an access_token + an item_id. Per Plaid's docs
// these must never leak to the client.
//
// Storage strategy (intentionally simple — this is a single-operator app):
//   1. Primary: .plaid-items.json sitting next to this file (gitignored).
//      Holds an array of items: { key, institution, accessToken, itemId,
//      linkedAt, lastSyncedAt, notes? }
//   2. Legacy fallback: env vars PLAID_TOKEN_<INSTITUTION> or the original
//      PLAID_ACCESS_TOKEN. Used when the JSON file isn't present so existing
//      deploys keep working unchanged.
//
// The catalog file is the source of truth for future updates: it tracks
// when each Item was linked, when it was last successfully synced, and any
// human-readable notes (e.g. "Robinhood IRA"). When you contact Plaid
// Support you need the item_id for the affected Item — read it from here.
//
// Why a file instead of a database: the deploy is a one-server cPanel/
// Passenger app with no DB. The file is excluded from the rsync deploy so it
// persists across releases (alongside .env). When migrating to a DB later,
// only this module needs to change.

const fs = require("fs");
const path = require("path");

const CATALOG_PATH = path.join(__dirname, "..", ".plaid-items.json");

function readCatalog() {
    try {
        const raw = fs.readFileSync(CATALOG_PATH, "utf8");
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.items) ? parsed.items : [];
    } catch (err) {
        if (err.code === "ENOENT") return null; // file just doesn't exist yet
        // Corrupt file should fail loudly; falling back silently to env vars
        // would hide a real problem the operator needs to fix.
        throw new Error(`Failed to read ${CATALOG_PATH}: ${err.message}`);
    }
}

function writeCatalog(items) {
    const payload = { version: 1, items, updatedAt: new Date().toISOString() };
    // 0o600 = owner read/write only. Defense in depth against accidental
    // exposure if file ACLs ever drift.
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(payload, null, 2), { mode: 0o600 });
}

function legacyEnvItems() {
    // Mirrors the prior getTokens() in routes/plaid.js. Order matters: the
    // first item is the "primary" so /item/remove without an id targets it.
    const out = [
        {
            key: "vanguard",
            institution: "Vanguard",
            accessToken: process.env.PLAID_TOKEN_VANGUARD || process.env.PLAID_ACCESS_TOKEN,
            itemId: null, // unknown — env vars don't carry the item_id
            linkedAt: null,
            lastSyncedAt: null,
            notes: "Migrated from env var; relink to populate itemId.",
        },
        {
            key: "robinhood",
            institution: "Robinhood",
            accessToken: process.env.PLAID_TOKEN_ROBINHOOD,
            itemId: null,
            linkedAt: null,
            lastSyncedAt: null,
            notes: "Migrated from env var; relink to populate itemId.",
        },
    ];
    return out.filter((i) => i.accessToken);
}

function loadItems() {
    const catalog = readCatalog();
    if (catalog && catalog.length) return catalog;
    return legacyEnvItems();
}

function addItem({ institution, accessToken, itemId, notes }) {
    if (!accessToken) throw new Error("addItem: accessToken is required");
    if (!itemId) throw new Error("addItem: itemId is required (Plaid returns it from itemPublicTokenExchange)");
    if (!institution) throw new Error("addItem: institution label is required");
    const existing = readCatalog() ?? [];
    // Don't store duplicate items. If the same itemId is being re-linked
    // (e.g. after a relink flow) update the token in place instead.
    const idx = existing.findIndex((i) => i.itemId === itemId);
    const now = new Date().toISOString();
    const next = idx >= 0
        ? existing.map((i, j) => j === idx ? { ...i, accessToken, linkedAt: now, notes: notes ?? i.notes } : i)
        : [
            ...existing,
            {
                key: institution.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                institution,
                accessToken,
                itemId,
                linkedAt: now,
                lastSyncedAt: null,
                notes: notes ?? null,
            },
        ];
    writeCatalog(next);
    return next.find((i) => i.itemId === itemId);
}

function removeItem(itemId) {
    const existing = readCatalog() ?? [];
    const next = existing.filter((i) => i.itemId !== itemId);
    writeCatalog(next);
    return existing.length - next.length;
}

function markSynced(itemId) {
    const existing = readCatalog();
    if (!existing) return; // legacy env-only mode; nothing to update
    const idx = existing.findIndex((i) => i.itemId === itemId);
    if (idx < 0) return;
    existing[idx] = { ...existing[idx], lastSyncedAt: new Date().toISOString() };
    writeCatalog(existing);
}

// Public-safe view: itemId + institution + timestamps, no tokens.
function listPublic() {
    return loadItems().map((i) => {
        const copy = { ...i };
        delete copy.accessToken;
        return copy;
    });
}

module.exports = { loadItems, addItem, removeItem, markSynced, listPublic, CATALOG_PATH };
