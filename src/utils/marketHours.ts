// NYSE open/closed status for the ticker tape, computed in New York time so
// it's right for visitors in any time zone.
//
// Regular session 9:30–16:00 ET, Mon–Fri. Holidays and 1pm early closes are
// listed per year and need a yearly refresh; for years not listed, only
// weekends count as closed.

const HOLIDAYS = new Set([
    // 2026
    "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
    "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
    // 2027
    "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
    "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);
const EARLY_CLOSE = new Set(["2026-11-27", "2026-12-24", "2027-11-26"]); // 13:00 ET

const OPEN_MIN = 9 * 60 + 30;
const CLOSE_MIN = 16 * 60;
const EARLY_CLOSE_MIN = 13 * 60;

interface NyClock { date: string; weekday: number; minutes: number } // weekday: 0 = Sun

function nyClock(at: Date): NyClock {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short",
        }).formatToParts(at).map((p) => [p.type, p.value]),
    );
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
    return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const isTradingDay = (c: NyClock) => c.weekday >= 1 && c.weekday <= 5 && !HOLIDAYS.has(c.date);
const closeMin = (date: string) => (EARLY_CLOSE.has(date) ? EARLY_CLOSE_MIN : CLOSE_MIN);

function inWords(mins: number): string {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export interface MarketStatus { open: boolean; detail: string }

export function marketStatus(now = new Date()): MarketStatus {
    const c = nyClock(now);
    if (isTradingDay(c) && c.minutes >= OPEN_MIN && c.minutes < closeMin(c.date)) {
        return { open: true, detail: `closes in ${inWords(closeMin(c.date) - c.minutes)}` };
    }
    if (isTradingDay(c) && c.minutes < OPEN_MIN) {
        return { open: false, detail: `opens in ${inWords(OPEN_MIN - c.minutes)}` };
    }
    // Step through calendar dates (not 24h jumps, which can skip a date on
    // daylight-saving weekends) to the next trading day.
    const [y, m, dd] = c.date.split("-").map(Number);
    for (let d = 1; d <= 10; d++) {
        const t = new Date(Date.UTC(y, m - 1, dd + d));
        const next: NyClock = { date: t.toISOString().slice(0, 10), weekday: t.getUTCDay(), minutes: 0 };
        if (!isTradingDay(next)) continue;
        const day = d === 1 ? "tomorrow" : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][next.weekday];
        return { open: false, detail: `opens ${day} 9:30 ET` };
    }
    return { open: false, detail: "" };
}
