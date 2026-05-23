import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./components/Home";
import Stablecoin from "./components/Stablecoin";
import Investments from "./components/Investments";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/investments" element={<Investments />} />
                <Route path="/stablecoin" element={<Stablecoin />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App
