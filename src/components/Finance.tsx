import { useState } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Portfolio } from "./Portfolio";
import { AllocationQuiz } from "./AllocationQuiz";
import { Holdings } from "./Holdings";

export default function Finance() {
    const [quizEquityPct, setQuizEquityPct] = useState<number | null>(null);

    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-8 rounded-md space-y-6">
                    <section>
                        <AllocationQuiz onApply={setQuizEquityPct} />
                    </section>
                    <div className="divider divider-primary" />
                    <section>
                        <Portfolio appliedEquityPct={quizEquityPct} />
                    </section>
                    <div className="divider divider-primary" />
                    <section>
                        <Holdings />
                    </section>
                </div>
            </div>
            <Footer />
        </div>
    );
}
