// Email notifications for server-side action-required events.
//
// Uses the server's local sendmail binary (available on all cPanel hosts) —
// no SMTP credentials or app passwords needed. Mail is sent as the hosting
// account and delivered directly, which also means it originates from your
// own domain rather than Gmail.
//
// Required env vars:
//   NOTIFY_TO   — recipient address (e.g. maplesomeone@gmail.com)
//
// Optional env vars:
//   NOTIFY_FROM — sender address shown in the From header
//                 (default: noreply@gordonzhong.com)
//   SITE_URL    — base URL for action links (default: https://gordonzhong.com)

const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({ sendmail: true, newline: "unix" });

async function sendPlaidRelinkEmail({ institution, itemId, errorCode }) {
    const to = process.env.NOTIFY_TO;
    if (!to) {
        console.warn("[notify] NOTIFY_TO not set — skipping Plaid relink email.");
        return;
    }

    const from = process.env.NOTIFY_FROM || "noreply@gordonzhong.com";
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
        `  1. Open this URL in your browser:`,
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
        from: `"Portfolio Server" <${from}>`,
        to,
        subject: `Action needed: Plaid relink required for ${institution}`,
        text,
        html,
    });

    console.log(`[notify] Plaid relink email sent to ${to} for ${institution} (${errorCode})`);
}

module.exports = { sendPlaidRelinkEmail };
