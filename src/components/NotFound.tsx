import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export default function NotFound() {
    return (
        <div className="container mx-auto w-full pt-4 overflow-x-hidden pt-18 bg-base-100 rounded-md">
            <Navbar />
            <div className="mockup-window border bg-base-300 !border-neutral dark:border-white rounded-md !overflow-visible">
                <div className="border-t !border-neutral dark:border-white px-4 py-24 rounded-md flex flex-col items-center text-center gap-3">
                    <p className="text-7xl font-extrabold text-primary tracking-tight">404</p>
                    <h1 className="text-2xl font-bold text-base-content">Page not found</h1>
                    <p className="text-base-content/60 max-w-md">
                        That page doesn’t exist. It may have moved, or the link has a typo.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mt-3">
                        <a href="/" className="btn btn-primary btn-sm">← Back home</a>
                        <a href="/investments" className="btn btn-ghost btn-sm">Investing Dashboard</a>
                        <a href="/stablecoin" className="btn btn-ghost btn-sm">Stablecoin</a>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}
