import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Allocation } from "./Allocation";
import { AllocationArchitecture } from "./AllocationArchitecture";

export default function AllocationPage() {
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-clip bg-base-100 rounded-md">
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible !pt-0 before:!hidden">
                <Navbar embedded />
                <div className="px-4 pt-4 pb-8 space-y-6">
                    <section>
                        <Allocation />
                    </section>
                </div>
            </div>
            <Footer />
            <AllocationArchitecture />
        </div>
    );
}
