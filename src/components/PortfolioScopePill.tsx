// Header control used by tab-scoped components (heatmap, allocation, risk
// stats) so each one tells you which portfolio it's showing and lets you
// switch from where you are instead of forcing a scroll back to the global
// tabs. Designed to read unambiguously as a button: a "Showing" prefix
// reveals what the control does, a real chevron SVG signals "dropdown", and
// btn-outline gives a visible idle border that fills on hover.
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
            aria-label={`Switch portfolio scope; currently showing ${current}. Click to change.`}
            title="Click to switch portfolio"
            className="btn btn-sm btn-outline normal-case font-normal gap-2"
        >
            <span className="text-[10px] uppercase tracking-widest text-base-content/50 font-semibold">Showing</span>
            <span className="font-semibold text-base-content">{current}</span>
            <svg width="11" height="11" viewBox="0 0 10 10" className="opacity-80" aria-hidden="true">
                <path
                    d="M2 3.5l3 3 3-3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
        <ul
            tabIndex={0}
            className="dropdown-content menu menu-sm bg-base-100 rounded-box z-20 mt-1 w-60 p-2 shadow-lg border border-base-300"
        >
            <li className="menu-title">
                <span>Switch portfolio</span>
            </li>
            {options.map((o) => (
                <li key={o}>
                    <a
                        className={current === o ? "active font-semibold" : ""}
                        onClick={() => {
                            onChange(o);
                            (document.activeElement as HTMLElement | null)?.blur();
                        }}
                    >
                        {o}
                        {current === o && <span aria-hidden="true" className="ml-auto text-xs opacity-70">●</span>}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);
