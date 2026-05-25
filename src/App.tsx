import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./components/Home";
import Stablecoin from "./components/Stablecoin";
import Portfolio from "./components/Portfolio";
import Now from "./components/Now";
import { CommandPalette } from "./components/CommandPalette";

function App() {
    return (
        <BrowserRouter>
            <CommandPalette />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/stablecoin" element={<Stablecoin />} />
                <Route path="/now" element={<Now />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
