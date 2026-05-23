# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gordon Zhong's personal portfolio site (`gordonzhong.com`) — a single-page React app showcasing dev work plus a few interactive personal features (photo gallery, weather, horoscope, an investing/finance section). It is two separately-deployed pieces: a Vite/React **frontend** (repo root) and a small Express **backend** (`server/`).

## Commands

Frontend (run from repo root):
- `npm run dev` — Vite dev server (port 5173)
- `npm run build` — production build into `dist/`
- `npm run lint` — ESLint (the only automated check; there is no test suite)
- `npm run fetch-cache` — refresh the baked-in ticker price cache (`src/data/tickerCache.json`) from Alpha Vantage before building

Backend (run from `server/`):
- `npm run dev` — `node --watch app.js` (port 3000)
- `npm start` — `node app.js`

## Deployment

Deployment is automated via **GitHub Actions** (`.github/workflows/deploy.yml`) on push to `main` (or manual `workflow_dispatch`). CI runs `npm ci` → `npm run build`, then `rsync`s the built `dist/` to the web root and `server/` to the Node app root over SSH, and restarts Passenger. Key points:

- **`dist/` is gitignored and built in CI — do NOT commit it.** Push source only; the workflow produces and ships the build.
- The backend runs under Passenger, which injects `PORT` (local dev falls back to 3000). The `server/` rsync excludes `.env`, `.htaccess`, and `node_modules` so production secrets, routing config, and installed deps are preserved.
- CI does **not** run `npm run fetch-cache` (rate-limited, mutates a tracked file). Refresh the ticker cache locally and commit `src/data/tickerCache.json` when you want fresher baked-in data.
- Frontend build vars (`VITE_ALPHAVANTAGE_KEY`, `VITE_WEATHER_API_KEY`) and the deploy SSH key (`CPANEL_SSH_KEY`) live in GitHub Actions **secrets**. SSH host/user/paths are non-secret env in the workflow.
- The old cPanel git-push flow (`.cpanel.yml`) has been removed; disable the cPanel-side Git Version Control repo so it doesn't also try to deploy.

## Architecture

### Frontend stack
- **React 19 + Vite 6 + TypeScript** — loosely typed (`noImplicitAny: false`), and `.tsx`/`.jsx` are mixed freely (Vite resolves extensions; e.g. `main.tsx` imports `./App.jsx` for the `App.tsx` file). Don't assume strict typing.
- **Styling: Tailwind v4 + DaisyUI v5**, configured entirely in `src/index.css` (no `tailwind.config`). Two DaisyUI themes are defined inline: `corporate` (default, light) and `business` (dark); theme switching uses `theme-change`. Prefer DaisyUI component/utility classes (`mockup-window`, `navbar`, `divider`, `base-100/200/300`, etc.) to match existing markup.
- **Path alias `@` → `src/`** (set in both `vite.config.js` and `tsconfig.json`).
- `components.json` (shadcn, hugeicons) exists but no `src/lib` or `src/components/ui` has been generated yet.

### Routing & page composition
`src/App.tsx` defines three routes via `BrowserRouter`: `/` (`Home`), `/finance` (`Finance`), `/stablecoin` (`Stablecoin`). Pages are assembled by composing section components inside a shared `Navbar` / `mockup-window` / `Footer` shell. SPA deep links work in production via `public/.htaccess` (rewrites everything except `/api/` to `index.html`).

### Backend (`server/`)
Express API mounted at `/api`, sole purpose is **Plaid** investment data (`server/routes/plaid.js`). The Plaid access-token setup is a manual one-time flow (`/api/link/token/create` → authorize in Plaid Link → `/api/link/token/exchange`, then paste the printed `access_token` into `PLAID_ACCESS_TOKEN`). Ongoing endpoints: `/api/investments`, `/api/balances`, `/api/health`. CORS is an explicit allowlist via `ALLOWED_ORIGINS`. Responses are deliberately reshaped to expose only display fields — never return raw Plaid objects.

### Frontend ↔ backend
The frontend calls the backend through **relative `/api/...` paths**, which production routes to Express. **There is no Vite dev proxy**, so `/api/*`-backed features (Plaid, the horoscope endpoint) won't resolve against a locally-running `server/` in `npm run dev` without one. Note the horoscope fetches use a doubled prefix (`/api/api/v1/get-horoscope/...`) — that reflects the production proxy layout, not a typo.

### Ticker/finance data layer (the most intricate part)
The finance section charts return data for VT/VXUS/BND/BNDX. `src/services/tickerService.ts` (`getTickerSeries`) resolves data through a **four-tier fallback**, in order:
1. `localStorage` cache (`av_ticker_cache_v2`, 24h TTL)
2. server cache at `/api/tickers.json` (≤25h old)
3. live Alpha Vantage fetch (`VITE_ALPHAVANTAGE_KEY`, staggered for the 5 req/min free-tier limit)
4. baked-in static JSON (`src/data/tickerCache.json`, imported at build time)

`src/hooks/useTickerData.ts` consumes this, falls back to the static cache on any failure, and **rebases** prices to percent-return-from-period-start for the selected range. Prices are stored raw; returns are always computed on demand.

There are **two separate cache-builder scripts** — keep them from drifting:
- `scripts/fetch-cache.mjs` — the `npm run fetch-cache` entry point that writes `src/data/tickerCache.json` (months keyed `YYYY-MM`).
- `src/services/tickerCache.ts` — a `node-cron` variant (`startCacheScheduler`, daily 06:00) keyed by full `YYYY-MM-DD`. Wire-up status is uncertain; treat the npm script as the source of truth for the committed cache.

## Environment variables

Frontend `.env` (Vite, must be `VITE_`-prefixed; see `.env.example`): `VITE_ALPHAVANTAGE_KEY`, `VITE_WEATHER_API_KEY`.
Backend `server/.env`: `PLAID_CLIENT_ID`, `PLAID_SECRET_SANDBOX`, `PLAID_SECRET_PRODUCTION`, `PLAID_ENV`, `PLAID_ACCESS_TOKEN`, `ALLOWED_ORIGINS`.
All `.env` files and `keys/` are gitignored.
