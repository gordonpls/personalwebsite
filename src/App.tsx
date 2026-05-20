import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./components/Home";
import Stablecoin from "./components/Stablecoin";
import Finance from "./components/Finance";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/stablecoin" element={<Stablecoin />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
