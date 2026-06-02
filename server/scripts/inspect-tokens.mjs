#!/usr/bin/env node
// One-shot CLI to inspect (and optionally remove) a batch of Plaid access
// tokens. Used to triage the "I have N Items but don't think I have N
// institutions" problem before any cleanup.
//
// Usage:
//   node server/scripts/inspect-tokens.mjs <tokens.csv>
//     Inspects every access_token in the CSV. Accepts the column shape from
//     the Plaid Dashboard export (access_token column, anything else
//     ignored), or one access_token per line.
//
//   node server/scripts/inspect-tokens.mjs --remove <access_token> [...]
//     Calls plaidClient.itemRemove on each token. Confirms by Y/N prompt.
//     Items removed this way are gone for good upstream.
//
// Reads PLAID_CLIENT_ID / PLAID_SECRET_PRODUCTION (or _SANDBOX) / PLAID_ENV
// from server/.env. Does NOT touch server/.plaid-items.json — operates on
// the raw tokens you provide. Safe to run repeatedly.

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode } from "plaid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env");

function loadEnv() {
    if (!fs.existsSync(ENV_PATH)) return;
    for (const line of fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
}
loadEnv();

const env = process.env.PLAID_ENV || "sandbox";
const secret = env === "production" ? process.env.PLAID_SECRET_PRODUCTION : process.env.PLAID_SECRET_SANDBOX;
if (!process.env.PLAID_CLIENT_ID || !secret) {
    console.error("Missing PLAID_CLIENT_ID or PLAID_SECRET_* in server/.env");
    process.exit(1);
}

const plaid = new PlaidApi(new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: { headers: { "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID, "PLAID-SECRET": secret } },
}));

function parseTokenInput(filepath) {
    const raw = fs.readFileSync(filepath, "utf8").trim();
    const lines = raw.split(/\r?\n/);
    if (lines.length === 0) return [];
    // CSV with header? detect a column called access_token (case-insensitive)
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const tokIdx = header.indexOf("access_token");
    if (tokIdx >= 0) {
        return lines.slice(1).map((row) => row.split(",")[tokIdx]?.trim()).filter(Boolean);
    }
    // Otherwise treat each line as a bare token.
    return lines.map((s) => s.trim()).filter((s) => s.startsWith("access-"));
}

function fmt(token) { return token.slice(0, 24) + "…"; }

async function inspectOne(token) {
    try {
        const a = await plaid.accountsGet({ access_token: token });
        const { accounts, item } = a.data;
        let institutionName = null;
        if (item?.institution_id) {
            try {
                const i = await plaid.institutionsGetById({
                    institution_id: item.institution_id,
                    country_codes: [CountryCode.Us],
                });
                institutionName = i.data.institution?.name ?? null;
            } catch { /* leave null */ }
        }
        return {
            tokenShort: fmt(token),
            tokenFull: token,
            itemId: item?.item_id ?? null,
            institutionId: item?.institution_id ?? null,
            institutionName,
            error: item?.error ?? null,
            consentedProducts: item?.consented_products ?? null,
            availableProducts: item?.available_products ?? null,
            accounts: (accounts || []).map((x) => ({
                accountId: x.account_id,
                name: x.name,
                officialName: x.official_name,
                mask: x.mask,
                type: x.type,
                subtype: x.subtype,
            })),
        };
    } catch (err) {
        return {
            tokenShort: fmt(token),
            tokenFull: token,
            error: err.response?.data?.error_message ?? err.message,
            errorCode: err.response?.data?.error_code ?? null,
        };
    }
}

function printReport(reports) {
    // Group by institution_id; surface duplicates.
    const byInst = new Map();
    const dead = [];
    for (const r of reports) {
        if (r.errorCode === "ITEM_NOT_FOUND" || r.errorCode === "INVALID_ACCESS_TOKEN") {
            dead.push(r);
            continue;
        }
        if (!r.institutionId) { dead.push(r); continue; }
        const arr = byInst.get(r.institutionId) ?? [];
        arr.push(r);
        byInst.set(r.institutionId, arr);
    }

    console.log("\n=== Inspect report ===\n");
    for (const [instId, group] of byInst.entries()) {
        const name = group[0].institutionName ?? "(unknown institution)";
        const dupe = group.length > 1 ? `  ⚠ ${group.length} tokens — duplicate` : "";
        console.log(`▶ ${name}   [${instId}]${dupe}`);
        for (const r of group) {
            const masks = r.accounts.map((a) => `${a.subtype ?? a.type}*${a.mask ?? "—"}`).join(", ");
            const errFlag = r.error ? `  ⚠ ${r.error.error_code}` : "";
            console.log(`   • ${r.tokenShort}   item_id=${r.itemId}   accounts=[${masks}]${errFlag}`);
        }
        console.log();
    }

    if (dead.length) {
        console.log("▶ Dead or unreachable tokens (safe to ignore — Plaid already cleaned them up):");
        for (const r of dead) {
            console.log(`   • ${r.tokenShort}   ${r.errorCode ?? "no item_id"}   ${r.error?.error_message ?? r.error ?? ""}`);
        }
        console.log();
    }

    // Cleanup suggestions
    const suggestions = [];
    for (const [, group] of byInst.entries()) {
        if (group.length <= 1) continue;
        // Suggest keeping the one without errors; ties broken arbitrarily.
        const keeper = group.find((r) => !r.error) ?? group[0];
        for (const r of group) {
            if (r !== keeper) suggestions.push(r.tokenFull);
        }
    }
    if (suggestions.length) {
        console.log(`Suggested removals (${suggestions.length} duplicate tokens):`);
        console.log(`  node server/scripts/inspect-tokens.mjs --remove \\\n    ${suggestions.join(" \\\n    ")}\n`);
    } else if (byInst.size > 0) {
        console.log("No duplicates detected. Every catalogued institution has exactly one Item.\n");
    }
}

async function removeMany(tokens) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise((r) => rl.question(q, r));
    console.log(`\nAbout to remove ${tokens.length} Item(s) upstream at Plaid (irreversible):`);
    for (const t of tokens) console.log("  -", fmt(t));
    const ans = (await ask("\nProceed? type YES to confirm: ")).trim();
    rl.close();
    if (ans !== "YES") { console.log("Aborted."); return; }
    for (const token of tokens) {
        try {
            const resp = await plaid.itemRemove({ access_token: token });
            console.log(`  ✓ removed   ${fmt(token)}   request_id=${resp.data.request_id}`);
        } catch (err) {
            const code = err.response?.data?.error_code ?? "UNKNOWN";
            console.log(`  ✗ failed    ${fmt(token)}   ${code}: ${err.response?.data?.error_message ?? err.message}`);
        }
    }
}

const args = process.argv.slice(2);
if (args[0] === "--remove") {
    const tokens = args.slice(1).filter((s) => s.startsWith("access-"));
    if (!tokens.length) { console.error("--remove needs one or more access-... tokens"); process.exit(1); }
    await removeMany(tokens);
} else if (args.length === 1 && fs.existsSync(args[0])) {
    const tokens = parseTokenInput(args[0]);
    if (!tokens.length) { console.error("No access tokens found in input."); process.exit(1); }
    console.log(`Inspecting ${tokens.length} token(s) against Plaid (${env})...`);
    const reports = await Promise.all(tokens.map(inspectOne));
    printReport(reports);
} else {
    console.error("Usage:");
    console.error("  node server/scripts/inspect-tokens.mjs <tokens.csv>");
    console.error("  node server/scripts/inspect-tokens.mjs --remove <access_token> [...]");
    process.exit(1);
}
