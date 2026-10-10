// Which bucket a holding belongs to: funds by what they hold (from the name),
// single stocks by sector (Finnhub industry rolled up to GICS-ish sectors).
// Shared by the allocation donut and the holdings filter chips so they agree.

interface CategoryHolding { ticker: string | null; name: string; type: string | null }
interface CategoryMeta { name?: string; type?: string; industry?: string }

const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : null);
const isFund = (h: CategoryHolding, m?: CategoryMeta) => {
    const t = (m?.type || h.type || "").toLowerCase();
    return t.includes("etf") || t.includes("fund");
};

// Roll Finnhub's industry (sub-sector level) up to a GICS-ish sector so the donut
// stays readable. Anything unrecognized is passed through, so genuine outliers
// still get their own slice (and may end up bucketed into "Other" if small).
const SECTOR_OF_INDUSTRY: Record<string, string> = {
    "Technology": "Technology",
    "Semiconductors": "Technology",
    "Software": "Technology",
    "Hardware": "Technology",
    "Internet": "Technology",
    "Media": "Communication Services",
    "Telecommunication": "Communication Services",
    "Pharmaceuticals": "Healthcare",
    "Biotechnology": "Healthcare",
    "Health Care": "Healthcare",
    "Medical Devices": "Healthcare",
    "Financial Services": "Financials",
    "Banks": "Financials",
    "Insurance": "Financials",
    "Capital Markets": "Financials",
    "Retail": "Consumer Discretionary",
    "Automobiles": "Consumer Discretionary",
    "Consumer Durables": "Consumer Discretionary",
    "Hotels, Restaurants & Leisure": "Consumer Discretionary",
    "Food, Beverage & Tobacco": "Consumer Staples",
    "Household Products": "Consumer Staples",
    "Personal Products": "Consumer Staples",
    "Energy": "Energy",
    "Oil & Gas": "Energy",
    "Electrical Equipment": "Industrials",
    "Aerospace & Defense": "Industrials",
    "Machinery": "Industrials",
    "Transportation": "Industrials",
    "Construction": "Industrials",
    "Materials": "Materials",
    "Chemicals": "Materials",
    "Metals & Mining": "Materials",
    "Real Estate": "Real Estate",
    "Utilities": "Utilities",
};

// Map a fund/ETF to a meaningful bucket using its name + ticker.
// Order matters: bonds first, then international, then sectors, then broad market.
function classifyFund(h: CategoryHolding, m?: CategoryMeta): string {
    const name = (m?.name || h.name || "").toLowerCase();
    const t = (h.ticker || "").toUpperCase();
    if (/bond|treasur|aggregate|fixed income|municipal/.test(name)) return "Bonds";
    if (/internation|ex-?us|emerging|developed market|world ex|eafe|all-world/.test(name)) return "International Equity";
    if (/uranium|nuclear|energy/.test(name)) return "Energy";
    if (/semiconductor/.test(name)) return "Technology";
    if (/digital infrastructure|data center|cloud/.test(name)) return "Technology";
    if (/real estate|reit/.test(name)) return "Real Estate";
    if (/health|biotech|pharma/.test(name)) return "Healthcare";
    if (/financ|bank/.test(name)) return "Financials";
    if (/utilit/.test(name)) return "Utilities";
    if (/gold|silver|preciou|commod/.test(name) || ["GLD", "SLV", "IAU"].includes(t)) return "Commodities";
    if (/small-?cap/.test(name)) return "US Small/Mid-Cap";
    if (/mid-?cap|extended market/.test(name)) return "US Small/Mid-Cap";
    if (/growth/.test(name)) return "US Growth";
    if (/value/.test(name)) return "US Value";
    if (/momentum/.test(name)) return "US Factor";
    if (/s&p 500|total stock market|total us|us market|large-?cap|nasdaq/.test(name)) return "US Broad Market";
    return "Other Funds";
}

export function categoryOf(h: CategoryHolding, m?: CategoryMeta): string {
    return isFund(h, m)
        ? classifyFund(h, m)
        : (SECTOR_OF_INDUSTRY[m?.industry ?? ""] || m?.industry || cap(h.type) || "Other");
}
