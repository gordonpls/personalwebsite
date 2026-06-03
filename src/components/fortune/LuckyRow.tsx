import { motion } from "framer-motion";

export interface Lucky {
    numbers: number[];
    powerball: number;
    color: { name: string; hex: string };
    element: { name: string; glyph: string };
}

export const LuckyRow = ({ lucky }: { lucky: Lucky }) => (
    <div className="flex flex-col items-center gap-3">
        {/* Numbers + powerball */}
        <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-base-content/70 font-semibold mb-1.5 text-center">Lucky numbers</p>
            <div className="flex items-center gap-1.5 md:gap-2 flex-wrap justify-center">
                {lucky.numbers.map((n, i) => (
                    <motion.span
                        key={n}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 * i, type: "spring", stiffness: 220 }}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-base-100 border-2 border-base-300 flex items-center justify-center text-xs md:text-sm font-bold tabular-nums text-base-content shadow-sm"
                    >
                        {n}
                    </motion.span>
                ))}
                <span className="text-base-content/30 text-lg px-0.5" aria-hidden="true">·</span>
                <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.6, type: "spring", stiffness: 220 }}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-error text-white flex items-center justify-center text-xs md:text-sm font-bold tabular-nums shadow"
                    title="Powerball"
                >
                    {lucky.powerball}
                </motion.span>
            </div>
        </div>

        {/* Color + element side by side */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-full pl-1.5 pr-3 py-1">
                <span
                    className="w-6 h-6 rounded-full shadow-inner border border-base-300"
                    style={{ background: lucky.color.hex }}
                    aria-hidden="true"
                />
                <div className="leading-tight">
                    <p className="text-[9px] uppercase tracking-widest text-base-content/60">Color</p>
                    <p className="text-xs md:text-sm font-medium text-base-content">{lucky.color.name}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 bg-base-100 border border-base-300 rounded-full pl-2 pr-3 py-1">
                <span className="w-6 h-6 rounded-full bg-base-200 flex items-center justify-center text-base" aria-hidden="true">
                    {lucky.element.glyph}
                </span>
                <div className="leading-tight">
                    <p className="text-[9px] uppercase tracking-widest text-base-content/60">Element</p>
                    <p className="text-xs md:text-sm font-medium text-base-content">{lucky.element.name}</p>
                </div>
            </div>
        </div>
    </div>
);
