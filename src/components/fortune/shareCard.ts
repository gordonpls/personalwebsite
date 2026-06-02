// Builds a 1080x1920 (Instagram-story aspect) share image for the daily
// fortune, entirely client-side via the Canvas 2D API. No html-to-image
// dependency. Returns a data URL the caller can either download or share.

import type { Lucky } from "./LuckyRow";
import type { Chinese } from "./ChinesePhrase";

interface BuildOpts {
    fortune: string;
    seed: string | null;
    lucky: Lucky;
    chinese: Chinese | null;
}

const W = 1080;
const H = 1920;

// Vertical layout cursor. Each section pushes the cursor down by its declared
// height; spacing constants are easy to tune in one place.
const PAD_X = 80;
const SECTION_GAP = 80;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const test = current ? current + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function formatDate(seed: string | null): string {
    if (!seed) return "Random fortune";
    const [y, m, d] = seed.split("-").map(Number);
    const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
    return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
}

export function buildShareImage({ fortune, seed, lucky, chinese }: BuildOpts): string {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported in this browser");

    // Background: deep warm gradient.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a1410");
    grad.addColorStop(0.6, "#241a12");
    grad.addColorStop(1, "#0d0907");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Lucky-color glow at bottom-center.
    const glow = ctx.createRadialGradient(W / 2, H * 0.82, 60, W / 2, H * 0.82, 700);
    glow.addColorStop(0, lucky.color.hex + "AA");
    glow.addColorStop(1, "#00000000");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    let y = 180;

    // ── Header ───────────────────────────────────────────────────────────────
    ctx.fillStyle = "#E8A020";
    ctx.font = "bold 32px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillText("🥠  TODAY'S FORTUNE", W / 2, y);
    y += 50;
    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.font = "28px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillText(formatDate(seed), W / 2, y);
    y += SECTION_GAP + 60;

    // ── Big serif fortune ────────────────────────────────────────────────────
    ctx.fillStyle = "#fff8e6";
    const fortuneFontSize = fortune.length > 100 ? 56 : fortune.length > 60 ? 64 : 72;
    ctx.font = `${fortuneFontSize}px Georgia, "Iowan Old Style", "Palatino Linotype", serif`;
    const fortuneLines = wrapText(ctx, `"${fortune}"`, W - 2 * PAD_X);
    const fortuneLineH = Math.round(fortuneFontSize * 1.35);
    for (const line of fortuneLines) {
        ctx.fillText(line, W / 2, y);
        y += fortuneLineH;
    }
    y += SECTION_GAP - 20;

    // ── Divider ──────────────────────────────────────────────────────────────
    ctx.strokeStyle = "rgba(232, 160, 32, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.32, y);
    ctx.lineTo(W * 0.68, y);
    ctx.stroke();
    y += SECTION_GAP;

    // ── Chinese phrase block ─────────────────────────────────────────────────
    if (chinese) {
        ctx.font = "bold 26px ui-sans-serif, -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillText("PHRASE OF THE DAY", W / 2, y);
        y += 100;
        ctx.font = "100px \"Noto Serif SC\", \"Songti SC\", \"STSong\", serif";
        ctx.fillStyle = "#fff8e6";
        ctx.fillText(chinese.phrase, W / 2, y);
        y += 70;
        ctx.font = "italic 36px Georgia, serif";
        ctx.fillStyle = "rgba(255, 240, 200, 0.7)";
        ctx.fillText(chinese.pinyin, W / 2, y);
        y += 60;
        ctx.font = "32px ui-sans-serif, -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        const transLines = wrapText(ctx, chinese.translation, W - 2 * PAD_X);
        for (const line of transLines) {
            ctx.fillText(line, W / 2, y);
            y += 44;
        }
        y += SECTION_GAP;
    }

    // ── Lucky numbers row ────────────────────────────────────────────────────
    ctx.font = "bold 26px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("LUCKY NUMBERS", W / 2, y);
    y += 90;

    const allBalls = [...lucky.numbers, lucky.powerball];
    const ballR = 55;
    const ballGap = 24;
    const totalW = allBalls.length * (ballR * 2) + (allBalls.length - 1) * ballGap;
    let bx = (W - totalW) / 2 + ballR;
    for (let i = 0; i < allBalls.length; i++) {
        const isPowerball = i === allBalls.length - 1;
        ctx.beginPath();
        ctx.arc(bx, y, ballR, 0, Math.PI * 2);
        ctx.fillStyle = isPowerball ? "#DC2626" : "#fff8e6";
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isPowerball ? "#7F1D1D" : "rgba(232, 160, 32, 0.5)";
        ctx.stroke();

        ctx.fillStyle = isPowerball ? "#ffffff" : "#1a1410";
        ctx.font = "bold 44px ui-sans-serif, -apple-system, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(String(allBalls[i]), bx, y + 2);
        ctx.textBaseline = "alphabetic";
        bx += ballR * 2 + ballGap;
    }
    y += ballR + 70;

    // ── Element + Color chip row ─────────────────────────────────────────────
    ctx.font = "28px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    const chipText = `${lucky.element.glyph}  ${lucky.element.name}    ·    ${lucky.color.name}`;
    ctx.fillText(chipText, W / 2, y);
    const swatchX = W / 2 + ctx.measureText(chipText).width / 2 + 26;
    ctx.beginPath();
    ctx.arc(swatchX, y - 9, 14, 0, Math.PI * 2);
    ctx.fillStyle = lucky.color.hex;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── Footer ──────────────────────────────────────────────────────────────
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "26px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillText("gordonzhong.com/fortune", W / 2, H - 80);

    return canvas.toDataURL("image/png");
}

export function downloadShareImage(dataUrl: string, seed: string | null) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `fortune-${seed ?? "random"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
