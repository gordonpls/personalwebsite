# Plaid storage & operations

This server talks to Plaid for one user (me) across one or more brokerage
Items. Tokens and identifiers stay server-side; the frontend only sees the
reshaped, privacy-safe `/api/holdings` and `/api/quotes` payloads.

This doc captures the storage layout, the link/exchange flow, the logging
contract, and the cleanup steps so future-you doesn't have to rebuild context.

## Storage

| What | Where | Committed? |
|---|---|---|
| `PLAID_CLIENT_ID`, `PLAID_SECRET_*`, `PLAID_ENV` | `server/.env` | No |
| Item access tokens + `item_id`s | `server/.plaid-items.json` (preferred) or `PLAID_TOKEN_*` env vars (legacy fallback) | No (gitignored) |
| Plaid event log | `server/logs/plaid.log` (one JSON line per event) | No (gitignored) |

**Never** expose access tokens, public tokens, `item_id`, or `account_id` to
the client. The catalog file is written with `0o600` (owner read/write only)
as defense in depth.

The deploy workflow excludes `.env`, `.htaccess`, and `node_modules` from the
backend rsync, so the catalog and logs both persist across deploys without
being overwritten by CI.

## Catalog shape (`server/.plaid-items.json`)

```jsonc
{
  "version": 1,
  "updatedAt": "2026-06-02T00:00:00.000Z",
  "items": [
    {
      "key": "vanguard",
      "institution": "Vanguard",
      "accessToken": "access-production-…",
      "itemId": "abc123…",
      "linkedAt": "2026-06-02T00:00:00.000Z",
      "lastSyncedAt": "2026-06-02T01:00:00.000Z",
      "notes": "Brokerage + Roth"
    }
  ]
}
```

`server/lib/plaid-items.js` is the only module that touches this file. If the
file doesn't exist, the module falls back to env vars (`PLAID_TOKEN_VANGUARD`,
`PLAID_TOKEN_ROBINHOOD`, or the original `PLAID_ACCESS_TOKEN`) so the
pre-catalog deploy keeps working.

## Linking a new Item

1. Set `PLAID_SETUP_ENABLED=true` in `server/.env` and restart the server.
2. `POST /api/link/token/create` (no body) → returns `{ link_token }`.
3. Open Plaid Link with that token (the bundled `server/test-link.html`
   page works), authorize the institution.
4. Plaid Link delivers a `public_token`. POST it back:
   ```http
   POST /api/link/token/exchange
   Content-Type: application/json

   { "public_token": "public-…", "institution": "Vanguard" }
   ```
5. The server exchanges it, persists `{ accessToken, itemId, institution,
   linkedAt }` into `server/.plaid-items.json`, and returns the same fields
   so you can also paste the token into your password manager as a backup.
6. Disable the setup flag: `PLAID_SETUP_ENABLED=false` (or unset). Restart.

## Removing an Item

Plaid charges for active Items and recommends removing ones you no longer
need. Delete an Item upstream **and** locally:

```http
POST /api/items/remove
Content-Type: application/json

{ "item_id": "abc123…" }
```

The route calls `plaidClient.itemRemove({ access_token })` and drops the
entry from the catalog. The route is gated behind `PLAID_SETUP_ENABLED`.

When to remove:
- The user (you) deletes the linked account at the brokerage.
- The Item has been in an error state long enough that relinking is the
  only fix.
- You no longer want to pay subscription fees for that Item.

## Listing Items (no tokens)

```http
GET /api/items
```

Returns the catalog without `accessToken` fields — useful for sanity-checking
what's persisted without exposing secrets. Also gated behind
`PLAID_SETUP_ENABLED`.

## Logging contract

Every Plaid call logs a JSON line via `server/lib/plaid-log.js`:

```json
{
  "ts": "2026-06-02T00:00:00.000Z",
  "level": "info",
  "event": "investments.holdings.get",
  "request_id": "…",
  "item_id": "…",
  "institution": "Vanguard"
}
```

Errors include `error_code` and `error_type` from Plaid's response body.
Access tokens and public tokens are stripped defensively if they ever
appear inside a string value.

Files: `server/logs/plaid.log`. If the `logs/` directory doesn't exist, lines
fall through to stderr (Passenger captures it). Create the directory to
enable file logging:

```sh
mkdir -p server/logs
```

## Identifiers to capture when contacting Plaid Support

Per Plaid's docs, Support needs these to find your request in their logs:

- `link_session_id` — comes through Link's `onExit` / `onEvent` / `onSuccess`.
- `request_id` — present on every Plaid response (success and error).
- `account_id` — for account-scoped issues.
- `item_id` — for Item-scoped issues.

All four are logged automatically by the helpers above where applicable.
Grep `server/logs/plaid.log` for the affected `item_id` or the timestamp
of the failure.

## Migration: env vars → catalog file

If you've been running with `PLAID_TOKEN_VANGUARD` / `PLAID_ACCESS_TOKEN` and
want to switch to the catalog file, you can either:

1. **Re-link** through the setup flow above — produces a fresh `item_id`
   and a new entry in the catalog.
2. **Manually create** `server/.plaid-items.json` with the existing token
   and a known `item_id` (which you can retrieve with `plaidClient.itemGet`
   from a Node REPL). Set `linkedAt` to the original link date if you
   remember it.

Until the file exists, the env-var fallback keeps the deploy working.
