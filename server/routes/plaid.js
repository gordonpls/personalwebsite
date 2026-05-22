const express = require("express");
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = require("plaid");

const router = express.Router();

const env = process.env.PLAID_ENV || "sandbox";

const plaidConfig = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
            "PLAID-SECRET": env === "production"
                ? process.env.PLAID_SECRET_PRODUCTION
                : process.env.PLAID_SECRET_SANDBOX,
        },
    },
});

const plaidClient = new PlaidApi(plaidConfig);

// ── One-time setup: create a Link token so you can connect your brokerage ──
// Call this once from your browser dev tools or Postman, then open the
// returned link_token in Plaid Link to authorize your accounts.
router.post("/link/token/create", async (_req, res) => {
    try {
        const response = await plaidClient.linkTokenCreate({
            user: { client_user_id: "owner" },
            client_name: "Gordon Zhong Portfolio",
            products: [Products.Investments],
            country_codes: [CountryCode.Us],
            language: "en",
        });
        res.json({ link_token: response.data.link_token });
    } catch (err) {
        console.error("[link/token/create]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to create link token" });
    }
});

// ── One-time setup: exchange the public token Plaid Link gives you ──
// After completing Link, POST the public_token here to get your access token.
// Copy the returned access_token into PLAID_ACCESS_TOKEN in your env vars.
router.post("/link/token/exchange", async (req, res) => {
    const { public_token } = req.body;
    if (!public_token) return res.status(400).json({ error: "public_token required" });
    try {
        const response = await plaidClient.itemPublicTokenExchange({ public_token });
        const { access_token, item_id } = response.data;
        // Log once so you can copy it — then store in env, never log again
        console.log("[SETUP] access_token:", access_token);
        console.log("[SETUP] item_id:", item_id);
        res.json({ access_token, item_id });
    } catch (err) {
        console.error("[link/token/exchange]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to exchange token" });
    }
});

// ── Ongoing: fetch your investment holdings ──
router.get("/investments", async (_req, res) => {
    const accessToken = process.env.PLAID_ACCESS_TOKEN;
    if (!accessToken) return res.status(503).json({ error: "No access token configured" });
    try {
        const [holdingsRes, accountsRes] = await Promise.all([
            plaidClient.investmentsHoldingsGet({ access_token: accessToken }),
            plaidClient.accountsGet({ access_token: accessToken }),
        ]);

        const { holdings, securities } = holdingsRes.data;
        const accounts = accountsRes.data.accounts;

        // Build a lookup map for securities
        const secMap = Object.fromEntries(
            securities.map((s) => [s.security_id, s])
        );

        // Return only the fields needed for display — no raw Plaid objects
        const payload = {
            accounts: accounts.map((a) => ({
                id: a.account_id,
                name: a.name,
                type: a.type,
                subtype: a.subtype,
                balance: a.balances.current,
                currency: a.balances.iso_currency_code,
            })),
            holdings: holdings.map((h) => {
                const sec = secMap[h.security_id] ?? {};
                return {
                    account_id: h.account_id,
                    name: sec.name ?? "Unknown",
                    ticker: sec.ticker_symbol ?? null,
                    type: sec.type ?? null,
                    quantity: h.quantity,
                    value: h.institution_value,
                    cost_basis: h.cost_basis,
                    currency: h.iso_currency_code,
                };
            }),
        };

        res.json(payload);
    } catch (err) {
        console.error("[investments]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to fetch investments" });
    }
});

// ── Ongoing: fetch account balances only (lighter call) ──
router.get("/balances", async (_req, res) => {
    const accessToken = process.env.PLAID_ACCESS_TOKEN;
    if (!accessToken) return res.status(503).json({ error: "No access token configured" });
    try {
        const response = await plaidClient.accountsBalanceGet({ access_token: accessToken });
        const accounts = response.data.accounts.map((a) => ({
            name: a.name,
            type: a.type,
            subtype: a.subtype,
            balance: a.balances.current,
            currency: a.balances.iso_currency_code,
        }));
        res.json({ accounts });
    } catch (err) {
        console.error("[balances]", err.response?.data ?? err.message);
        res.status(500).json({ error: "Failed to fetch balances" });
    }
});

module.exports = router;
