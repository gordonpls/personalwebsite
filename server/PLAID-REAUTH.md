# Plaid Brokerage Re-authentication

Use this when your brokerage connection breaks (ITEM_LOGIN_REQUIRED — bank credentials changed, MFA reset, institution revoked access). The relink flow re-authenticates your existing Item in update mode, so **no new trial connection is consumed** and your access token stays the same.

## Signs you need to relink

- Holdings section on the site shows "Holdings are temporarily unavailable"
- Server logs show `ITEM_LOGIN_REQUIRED` or `PENDING_EXPIRATION`
- You received a "Action needed: Plaid relink required" email

## Steps to relink (browser only, no deploy needed)

1. Open this URL in your browser (replace `<SECRET>` with `PLAID_RELINK_SECRET` from `server/.env`):

   ```
   https://gordonzhong.com/api/plaid/relink?secret=<SECRET>
   ```

   To target a specific institution, append `&item_id=<itemId>` (find the ID in `.plaid-items.json`). Omitting it defaults to the first item currently in an error state.

2. Complete the Plaid Link flow — re-authenticate at your institution.

3. The page confirms "✅ Relink complete" and busts the holdings cache automatically. The site will show fresh data on the next poll (within seconds).

## What this does NOT do

- Does **not** create a new Plaid Item (no new trial connection)
- Does **not** require a new public token exchange
- Does **not** change your access token
- Does **not** require a server restart or deploy

## Verify the email notification works

After a deploy or server change, confirm the notification email is wired up:

```
https://gordonzhong.com/api/plaid/notify-test?secret=<SECRET>
```

You should receive a test email at the address in `NOTIFY_TO` (server/.env). Check spam if it doesn't arrive within a minute. A `❌ Email failed` response means `sendmail` isn't reachable — check server logs.

## Inspect item status

```
https://gordonzhong.com/api/plaid/items/inspect?secret=<SECRET>   # requires PLAID_SETUP_ENABLED=true
```

Or read `.plaid-items.json` directly on the server — it tracks `error`, `errorAt`, and `lastSyncedAt` per item.
