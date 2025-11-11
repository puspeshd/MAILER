import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import MailDesigner from "./pages/MailDesigner";
import ColabHealth from "./components/ColabHealth"; // 👈 import the new component
import "./App.css";

export default function App() {
  const navigate = useNavigate();

  return (
    <div className="app-container">
      <header
        className="header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#111827",
          color: "white",
          padding: "0.8rem 1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}
      >
        <nav style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => navigate("/")}
            className="nav-button"
            style={{
              background: "#2563eb",
              border: "none",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/designer")}
            className="nav-button"
            style={{
              background: "#4f46e5",
              border: "none",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Mail Designer
          </button>
        </nav>

        {/* 👇 Add Colab Health Check */}
        <ColabHealth />
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
