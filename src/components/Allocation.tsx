import { useState } from "react";
import { AllocationQuiz } from "./AllocationQuiz";
import { HypotheticalPortfolio } from "./HypotheticalPortfolio";

// Home "Allocation" section: the risk quiz feeds its recommended equity split
// into the hypothetical portfolio simulator below it.
export const Allocation = () => {
    const [quizEquityPct, setQuizEquityPct] = useState<number | null>(null);

    return (
        <div className="space-y-6">
            <AllocationQuiz onApply={setQuizEquityPct} />
            <HypotheticalPortfolio appliedEquityPct={quizEquityPct} />
        </div>
    );
};
