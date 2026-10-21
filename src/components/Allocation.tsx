import { useState } from "react";
import { AllocationQuiz } from "./AllocationQuiz";
import { HypotheticalPortfolio, type AppliedMix } from "./HypotheticalPortfolio";

// Home "Allocation" section: the risk quiz hands its recommended split to the
// hypothetical portfolio simulator below it as soon as the results show.
export const Allocation = () => {
    const [applied, setApplied] = useState<AppliedMix | null>(null);

    return (
        <div className="space-y-6">
            <AllocationQuiz onApply={(equity, label, color, age, years) => setApplied({ equity, label, color, age, years, nonce: Date.now() })} />
            <HypotheticalPortfolio applied={applied} />
        </div>
    );
};
