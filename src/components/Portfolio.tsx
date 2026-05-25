import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Portfolios } from "./Portfolios";
import { PortfolioArchitecture } from "./PortfolioArchitecture";

export default function Portfolio() {
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 pt-4 pb-8 rounded-md space-y-6">
                    <section>
                        <Portfolios />
                    </section>
                </div>
            </div>
            <Footer />
            <PortfolioArchitecture />
        </div>
    );
}
