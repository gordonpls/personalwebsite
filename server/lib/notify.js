// Email notifications for server-side action-required events.
//
// Uses Gmail SMTP with an App Password (not your regular password).
// To set up: Google Account → Security → 2-Step Verification → App passwords
//   → generate one for "Portfolio Server" → paste into GMAIL_APP_PASSWORD.
//
// Required env vars:
//   GMAIL_USER         — the Gmail address that sends the email
//   GMAIL_APP_PASSWORD — the 16-char App Password (not your login password)
//   NOTIFY_TO          — recipient address (defaults to GMAIL_USER)
//
// Optional env vars:
//   SITE_URL           — base URL for action links (default: https://gordonzhong.com)

const nodemailer = require("nodemailer");

function getTransport() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) return null;
    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });
}

async function sendPlaidRelinkEmail({ institution, itemId, errorCode }) {
    const transport = getTransport();
    if (!transport) {
        console.warn("[notify] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping email for Plaid relink.");
        return;
    }

    const to = process.env.NOTIFY_TO || process.env.GMAIL_USER;
    const base = (process.env.SITE_URL || "https://gordonzhong.com").replace(/\/$/, "");
    const secret = process.env.PLAID_RELINK_SECRET || "<PLAID_RELINK_SECRET>";
    const relinkUrl = `${base}/api/plaid/relink?secret=${encodeURIComponent(secret)}${itemId ? `&item_id=${encodeURIComponent(itemId)}` : ""}`;
    const detectedAt = new Date().toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "full", timeStyle: "short" });

    const text = [
        `Your ${institution} Plaid connection needs to be re-authorized.`,
        ``,
        `Error:     ${errorCode}`,
        `Detected:  ${detectedAt} ET`,
        `Item ID:   ${itemId || "unknown"}`,
        ``,
        `Steps to fix:`,
        ``,
        `  1. Open this URL in your browser (stay logged out of Spotify etc. — this`,
        `     goes to Plaid, not Spotify):`,
        ``,
        `     ${relinkUrl}`,
        ``,
        `  2. Plaid Link will open. Re-authenticate with your ${institution} credentials.`,
        ``,
        `  3. Once the flow completes, the page confirms success and your holdings`,
        `     data will refresh immediately (cache is busted automatically).`,
        ``,
        `No server changes or deploys are needed.`,
        ``,
        `— Portfolio Server`,
    ].join("\n");

    const html = `
<p>Your <strong>${institution}</strong> Plaid connection needs to be re-authorized.</p>
<table style="border-collapse:collapse;margin-bottom:1em">
  <tr><td style="padding:2px 12px 2px 0;color:#666">Error</td><td><code>${errorCode}</code></td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#666">Detected</td><td>${detectedAt} ET</td></tr>
  <tr><td style="padding:2px 12px 2px 0;color:#666">Item ID</td><td><code>${itemId || "unknown"}</code></td></tr>
</table>
<h3 style="margin-bottom:.5em">Steps to fix</h3>
<ol>
  <li style="margin-bottom:.75em">
    Open this URL in your browser:<br>
    <a href="${relinkUrl}" style="word-break:break-all">${relinkUrl}</a>
  </li>
  <li style="margin-bottom:.75em">
    Plaid Link will open. Re-authenticate with your <strong>${institution}</strong> credentials.
  </li>
  <li>
    Once the flow completes, the page confirms success and your holdings data
    will refresh immediately — the cache is busted automatically.
  </li>
</ol>
<p>No server changes or deploys are needed.</p>
<hr style="border:none;border-top:1px solid #eee;margin:1.5em 0">
<p style="color:#999;font-size:.85em">Portfolio Server</p>`;

    await transport.sendMail({
        from: `"Portfolio Server" <${process.env.GMAIL_USER}>`,
        to,
        subject: `Action needed: Plaid relink required for ${institution}`,
        text,
        html,
    });

    console.log(`[notify] Plaid relink email sent to ${to} for ${institution} (${errorCode})`);
}

module.exports = { sendPlaidRelinkEmail };
