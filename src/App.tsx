import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./components/Home";
import Stablecoin from "./components/Stablecoin";
import Portfolio from "./components/Portfolio";
import AllocationPage from "./components/AllocationPage";
import Fortune from "./components/Fortune";
import NotFound from "./components/NotFound";
import { CommandPalette } from "./components/CommandPalette";

function App() {
    return (
        <BrowserRouter>
            <CommandPalette />
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
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
