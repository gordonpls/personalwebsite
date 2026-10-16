import { useCountUp } from "@/hooks/useCountUp";

// Drop-in number that counts up from 0 the first time it scrolls into view.
export const CountUp = ({ value, decimals = 0 }: { value: number; decimals?: number }) => {
    const { ref, value: shown } = useCountUp<HTMLSpanElement>(value);
    return <span ref={ref} className="tabular-nums">{shown.toFixed(decimals)}</span>;
};
