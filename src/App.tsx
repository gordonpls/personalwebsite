import './App.css'
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./components/Home";
import { CommandPalette } from "./components/CommandPalette";

// Home is the landing page (eager). The secondary routes — and their heavy deps
// (recharts, react-pdf, the fortune canvas) — are code-split so visiting "/"
// doesn't have to load them, which keeps the home page's initial graph small.
const Portfolio = lazy(() => import("./components/Portfolio"));
const AllocationPage = lazy(() => import("./components/AllocationPage"));
const Stablecoin = lazy(() => import("./components/Stablecoin"));
const Fortune = lazy(() => import("./components/Fortune"));
const ButtonAnimDemo = lazy(() => import("./components/ButtonAnimDemo"));
const NotFound = lazy(() => import("./components/NotFound"));

const RouteFallback = () => (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-primary" />
    </div>
);

function App() {
    return (
        <BrowserRouter>
            <CommandPalette />
            <Suspense fallback={<RouteFallback />}>
            <Routes>
                <Route path="/" element={<Home />} />
                {/* Top-level anchor aliases — also 302'd by .htaccess in production. */}
                <Route path="/about" element={<Navigate to="/#about" replace />} />
                <Route path="/resume" element={<Navigate to="/#resume" replace />} />
                <Route path="/projects" element={<Navigate to="/#projects" replace />} />
                <Route path="/highlights" element={<Navigate to="/#highlights" replace />} />
                <Route path="/gallery" element={<Navigate to="/#gallery" replace />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/allocation" element={<AllocationPage />} />
                <Route path="/stablecoin" element={<Stablecoin />} />
                <Route path="/fortune" element={<Fortune />} />
                <Route path="/button-demo" element={<ButtonAnimDemo />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
        </BrowserRouter>
    );
}

export default App
