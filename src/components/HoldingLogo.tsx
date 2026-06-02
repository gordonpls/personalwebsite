import { useState } from "react";

export interface LogoMeta { name?: string; logo?: string }

// ETF issuer detection by name keyword → domain we can pull a favicon from.
// Order matters when issuer names overlap (e.g. "iShares MSCI" should hit
// BlackRock/iShares before any generic "MSCI" rule).
const ETF_ISSUERS: { test: RegExp; domain: string }[] = [
    { test: /\bvanguard\b/i, domain: "vanguard.com" },
    { test: /\b(ishares|blackrock)\b/i, domain: "ishares.com" },
    { test: /\b(spdr|state street)\b/i, domain: "ssga.com" },
    { test: /\bschwab\b/i, domain: "schwab.com" },
    { test: /\binvesco\b/i, domain: "invesco.com" },
    { test: /\bvaneck\b/i, domain: "vaneck.com" },
    { test: /\bfidelity\b/i, domain: "fidelity.com" },
    { test: /\bpacer\b/i, domain: "paceretfs.com" },
    { test: /\bproshares\b/i, domain: "proshares.com" },
    { test: /\bwisdomtree\b/i, domain: "wisdomtree.com" },
    { test: /\bjpmorgan\b/i, domain: "jpmorgan.com" },
    { test: /\bglobal x\b/i, domain: "globalxetfs.com" },
];

export function getLogoUrl(ticker: string | null, meta?: LogoMeta): string | null {
    // Stocks: Finnhub usually has a logo and we bake it into holdingsMeta.json.
    if (meta?.logo) return meta.logo;
    // ETFs: identify the issuer from the fund name → favicon via Google.
    const name = meta?.name ?? "";
    for (const issuer of ETF_ISSUERS) {
        if (issuer.test.test(name)) {
            return `https://www.google.com/s2/favicons?domain=${issuer.domain}&sz=128`;
        }
    }
    // Last-ditch: Finnhub's stock-logo bucket. May 404 for ETFs; the <HoldingLogo />
    // component swaps to a letter chip on error.
    return ticker
        ? `https://static2.finnhub.io/file/publicdatany/finnhubimage/stock_logo/${ticker}.png`
        : null;
}

/**
 * Resolves a holding logo (stocks via Finnhub URL; ETFs via issuer-favicon
 * lookup) and falls back to a colored ticker-letter chip on 404. Used by both
 * the Live Positions list and the HoldingsMeta detail header so the same
 * holding shows the same icon in both places.
 *
 * Sizing is controlled entirely via `className` (caller passes a size-* and
 * rounding utility) so the same component fits both the compact list row
 * (size-8 rounded-md) and the larger detail header (w-11 h-11 rounded-lg).
 */
export const HoldingLogo = ({
    ticker,
    meta,
    className = "size-8 rounded-md",
    fallbackTextClass = "text-[9px]",
}: {
    ticker: string | null;
    meta?: LogoMeta;
    className?: string;
    fallbackTextClass?: string;
}) => {
    const [failed, setFailed] = useState(false);
    const url = getLogoUrl(ticker, meta);
    if (!url || failed) {
        return (
            <div
                className={`${className} bg-base-200 border border-base-300 flex items-center justify-center font-bold text-base-content/60 shrink-0 ${fallbackTextClass}`}
                aria-hidden="true"
            >
                {ticker ? ticker.slice(0, 4) : "—"}
            </div>
        );
    }
    return (
        <img
            className={`${className} bg-base-100 border border-base-300 object-contain p-0.5 shrink-0`}
            src={url}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
        />
    );
};
