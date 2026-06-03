import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./components/Home";
import Stablecoin from "./components/Stablecoin";
import Portfolio from "./components/Portfolio";
import AllocationPage from "./components/AllocationPage";
import Fortune from "./components/Fortune";
import CarouselPreviews from "./components/CarouselPreviews";
import NotFound from "./components/NotFound";
import { CommandPalette } from "./components/CommandPalette";

function App() {
    return (
        <BrowserRouter>
            <CommandPalette />
            <Routes>
                <Route path="/" element={<Home />} />
                {/* /about → the About section on Home (production also has a 302 in .htaccess). */}
                <Route path="/about" element={<Navigate to="/#about" replace />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/allocation" element={<AllocationPage />} />
                <Route path="/stablecoin" element={<Stablecoin />} />
                <Route path="/fortune" element={<Fortune />} />
                <Route path="/preview/carousel" element={<CarouselPreviews />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
