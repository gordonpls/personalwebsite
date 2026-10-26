import { useState } from "react";
import { AllocationQuiz } from "./AllocationQuiz";
import { HypotheticalPortfolio, type AppliedMix } from "./HypotheticalPortfolio";

// Home "Allocation" section: the risk quiz hands its recommended split to the
// hypothetical portfolio simulator below it as soon as the results show.
export const Allocation = () => {
    const [applied, setApplied] = useState<AppliedMix | null>(null);

    return (
        <div className="space-y-6">
            <AllocationQuiz onApply={(equity, label, color, years) => setApplied({ equity, label, color, years, nonce: Date.now() })} />
            {/* Until the quiz hands over a mix, the simulator is the side door. */}
            {!applied && (
                <div className="divider divider-quiet text-xs font-medium uppercase tracking-widest text-base-content/60">
                    Or explore the simulator yourself
                </div>
            )}
            <HypotheticalPortfolio applied={applied} />
        </div>
    );
};
