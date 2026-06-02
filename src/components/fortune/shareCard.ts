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

    // Background: vertical gradient flavored by the lucky color.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#1a1410");
    grad.addColorStop(0.6, "#241a12");
    grad.addColorStop(1, "#0d0907");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft tinted glow from the lucky color, bottom-center.
    const glow = ctx.createRadialGradient(W / 2, H * 0.82, 60, W / 2, H * 0.82, 700);
    glow.addColorStop(0, lucky.color.hex + "AA");
    glow.addColorStop(1, "#00000000");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Header eyebrow
    ctx.textAlign = "center";
    ctx.fillStyle = "#E8A020";
    ctx.font = "bold 28px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillText("🥠  TODAY'S FORTUNE", W / 2, 200);

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "24px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillText(formatDate(seed), W / 2, 250);

    // Fortune body, serif, wrapped
    ctx.fillStyle = "#fff8e6";
    const fortuneFontSize = fortune.length > 100 ? 56 : fortune.length > 60 ? 64 : 72;
    ctx.font = `${fortuneFontSize}px Georgia, "Iowan Old Style", "Palatino Linotype", serif`;
    const fortuneLines = wrapText(ctx, `"${fortune}"`, W - 160);
    let y = 460;
    const lineHeight = Math.round(fortuneFontSize * 1.35);
    for (const line of fortuneLines) {
        ctx.fillText(line, W / 2, y);
        y += lineHeight;
    }

    // Divider
    y += 60;
    ctx.strokeStyle = "rgba(232, 160, 32, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W * 0.3, y);
    ctx.lineTo(W * 0.7, y);
    ctx.stroke();

    // Chinese phrase block
    if (chinese) {
        y += 110;
        ctx.font = "bold 24px ui-sans-serif, -apple-system, system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillText("PHRASE OF THE DAY", W / 2, y);
        y += 80;
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
        const transLines = wrapText(ctx, chinese.translation, W - 200);
        for (const line of transLines) {
            ctx.fillText(line, W / 2, y);
            y += 40;
        }
    }

    // Lucky numbers row, near the bottom
    const ballY = H - 380;
    ctx.font = "bold 24px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("LUCKY NUMBERS", W / 2, ballY - 50);

    const allBalls = [...lucky.numbers, lucky.powerball];
    const ballR = 55;
    const ballGap = 24;
    const totalW = allBalls.length * (ballR * 2) + (allBalls.length - 1) * ballGap;
    let bx = (W - totalW) / 2 + ballR;
    for (let i = 0; i < allBalls.length; i++) {
        const isPowerball = i === allBalls.length - 1;
        ctx.beginPath();
        ctx.arc(bx, ballY, ballR, 0, Math.PI * 2);
        ctx.fillStyle = isPowerball ? "#DC2626" : "#fff8e6";
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = isPowerball ? "#7F1D1D" : "rgba(232, 160, 32, 0.5)";
        ctx.stroke();

        ctx.fillStyle = isPowerball ? "#ffffff" : "#1a1410";
        ctx.font = "bold 44px ui-sans-serif, -apple-system, system-ui, sans-serif";
        ctx.textBaseline = "middle";
        ctx.fillText(String(allBalls[i]), bx, ballY + 2);
        ctx.textBaseline = "alphabetic";
        bx += ballR * 2 + ballGap;
    }

    // Element + Color chip row
    const chipY = ballY + 130;
    ctx.font = "26px ui-sans-serif, -apple-system, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`${lucky.element.glyph}  ${lucky.element.name}    ·    ${lucky.color.name}`, W / 2, chipY);
    // tiny color swatch dot
    const swatchX = W / 2 + ctx.measureText(`${lucky.element.glyph}  ${lucky.element.name}    ·    ${lucky.color.name}`).width / 2 + 24;
    ctx.beginPath();
    ctx.arc(swatchX, chipY - 8, 14, 0, Math.PI * 2);
    ctx.fillStyle = lucky.color.hex;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Footer
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
