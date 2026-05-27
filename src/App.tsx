import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./components/Home";
import Stablecoin from "./components/Stablecoin";
import Portfolio from "./components/Portfolio";
import NotFound from "./components/NotFound";
import { CommandPalette } from "./components/CommandPalette";

function App() {
    return (
        <BrowserRouter>
            <CommandPalette />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/stablecoin" element={<Stablecoin />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
