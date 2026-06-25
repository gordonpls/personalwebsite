// Email notifications for server-side action-required events.
//
// Uses cPanel's SMTP server with a real mailbox — the local relay approaches
// (sendmail binary, localhost:25) both fail on this host: the sendmail wrapper
// rejects senders that aren't real mailboxes, and the local MTA blocks relay
// to external addresses without auth.
//
// One-time setup: create the sender mailbox in cPanel → Email Accounts, then
// add its password to server/.env as SMTP_PASS.
//
// Required env vars:
//   NOTIFY_TO   — recipient address (e.g. maplesomeone@gmail.com)
//   SMTP_PASS   — password for the SMTP_USER mailbox
//
// Optional env vars:
//   NOTIFY_FROM / SMTP_USER — sender address (default: noreply@gordonzhong.com)
//   SMTP_HOST   — mail server hostname (default: mail.gordonzhong.com)
//   SMTP_PORT   — 465 (SSL, default) or 587 (STARTTLS)
//   SITE_URL    — base URL for action links (default: https://gordonzhong.com)

const nodemailer = require("nodemailer");

function makeTransport() {
    const user = process.env.SMTP_USER || process.env.NOTIFY_FROM || "noreply@gordonzhong.com";
    const pass = process.env.SMTP_PASS;
    const host = process.env.SMTP_HOST || "mail.gordonzhong.com";
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const secure = port === 465;
    return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

async function sendPlaidRelinkEmail({ institution, itemId, errorCode }) {
    const to = process.env.NOTIFY_TO;
    if (!to) {
        console.warn("[notify] NOTIFY_TO not set — skipping Plaid relink email.");
        return;
    }
    if (!process.env.SMTP_PASS) {
        throw new Error("SMTP_PASS not set in server/.env — email not configured");
    }

    const from = process.env.SMTP_USER || process.env.NOTIFY_FROM || "noreply@gordonzhong.com";
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

    await makeTransport().sendMail({
        from: `"Portfolio Server" <${from}>`,
        to,
        subject: `Action needed: Plaid relink required for ${institution}`,
        text,
        html,
    });

    console.log(`[notify] Plaid relink email sent to ${to} for ${institution} (${errorCode})`);
}

module.exports = { sendPlaidRelinkEmail };
