// Tiny header chip used by tab-scoped components (heatmap, allocation, risk
// stats) so each one tells you which portfolio it's showing and lets you
// switch from where you are, instead of forcing you to scroll back up to the
// global tabs. Wired to the same state as the tabs.
export const PortfolioScopePill = ({
    current,
    onChange,
    options,
}: {
    current: string;
    onChange: (next: string) => void;
    options: readonly string[];
}) => (
    <div className="dropdown dropdown-end shrink-0">
        <div
            tabIndex={0}
            role="button"
            aria-label={`Change portfolio scope; currently ${current}`}
            className="btn btn-xs btn-ghost gap-1.5 px-2 normal-case font-normal text-xs text-base-content/70 hover:text-base-content border border-base-300"
        >
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span>{current}</span>
            <span className="text-base-content/40 text-[10px]" aria-hidden="true">▾</span>
        </div>
        <ul
            tabIndex={0}
            className="dropdown-content menu menu-sm bg-base-100 rounded-box z-20 mt-1 w-56 p-2 shadow-lg border border-base-300"
        >
            <li className="menu-title">
                <span>Show holdings from</span>
            </li>
            {options.map((o) => (
                <li key={o}>
                    <a
                        className={current === o ? "active" : ""}
                        onClick={() => {
                            onChange(o);
                            (document.activeElement as HTMLElement | null)?.blur();
                        }}
                    >
                        {o}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);
