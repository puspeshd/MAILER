import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MailDesigner from "./pages/MailDesigner";
import "./App.css";

export default function App() {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <header className="header">
        
        <nav>
          <button
            onClick={() => navigate("/")}
            className="nav-button"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/designer")}
            className="nav-button"
          >
            Mail Designer
          </button>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/designer" element={<MailDesigner />} />
        </Routes>
      </main>
    </div>
  );
}
