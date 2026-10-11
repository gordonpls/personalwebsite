// Verifies the Plaid-Verification JWT that Plaid attaches to every webhook.
//
// Per Plaid's docs (Webhook verification):
//   1. The header is a JWS signed with ES256; its `kid` names the signing key.
//   2. Fetch that key from /webhook_verification_key/get (cache it by kid; a key
//      with `expired_at` set must no longer be trusted).
//   3. Verify the signature, reject tokens whose `iat` is older than 5 minutes
//      (replay protection), and compare the claim `request_body_sha256` with the
//      SHA-256 of the exact raw body bytes (so the payload can't be swapped).
//
// No JWT library: ES256 + JWK import is a few lines with node:crypto, and it
// keeps the dependency surface of the Plaid path small.

const crypto = require("crypto");

const MAX_AGE_S = 5 * 60;
const keyCache = new Map(); // kid -> KeyObject

const b64urlJson = (s) => JSON.parse(Buffer.from(s, "base64url").toString("utf8"));

async function getKey(plaidClient, kid) {
    if (keyCache.has(kid)) return keyCache.get(kid);
    const resp = await plaidClient.webhookVerificationKeyGet({ key_id: kid });
    const jwk = resp.data?.key;
    if (!jwk || jwk.expired_at) throw new Error("verification key missing or expired");
    const key = crypto.createPublicKey({
        key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
        format: "jwk",
    });
    keyCache.set(kid, key);
    return key;
}

// Resolves true/false; never throws. `rawBody` must be the unparsed request Buffer.
async function verifyPlaidWebhook(plaidClient, token, rawBody) {
    try {
        if (!token || !rawBody) return false;
        const [h, p, sig] = String(token).split(".");
        if (!h || !p || !sig) return false;

        const header = b64urlJson(h);
        if (header.alg !== "ES256" || !header.kid) return false;

        const key = await getKey(plaidClient, header.kid);
        const ok = crypto.verify(
            "sha256",
            Buffer.from(`${h}.${p}`),
            { key, dsaEncoding: "ieee-p1363" }, // JWS carries raw r||s, not DER
            Buffer.from(sig, "base64url"),
        );
        if (!ok) return false;

        const claims = b64urlJson(p);
        if (typeof claims.iat !== "number" || Date.now() / 1000 - claims.iat > MAX_AGE_S) return false;

        const want = Buffer.from(String(claims.request_body_sha256 || ""), "utf8");
        const got = Buffer.from(crypto.createHash("sha256").update(rawBody).digest("hex"), "utf8");
        return want.length === got.length && crypto.timingSafeEqual(want, got);
    } catch {
        return false;
    }
}

module.exports = { verifyPlaidWebhook };
