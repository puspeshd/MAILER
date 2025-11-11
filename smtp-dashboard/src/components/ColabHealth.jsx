import React, { useState, useEffect } from "react";
import { Info, RefreshCw } from "lucide-react";

const ColabHealth = () => {
  const [status, setStatus] = useState("checking");
  const [loading, setLoading] = useState(false);

  const COLAB_NOTEBOOK_URL = "https://colab.research.google.com/drive/1vdUe_7oQLbZ3g9pmiRn4ZdmjmsUQm2Xo";

  const CHECK_URL = "https://puspeshd.pythonanywhere.com/status";

  const checkColabHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch(CHECK_URL);
      const data = await res.json();
      setStatus(data.colab_alive ? "running" : "stopped");

    } catch (err) {
      console.error(err);
      setStatus("stopped");
    }
    setLoading(false);
  };

 useEffect(() => {
  checkColabHealth();
  const interval = setInterval(checkColabHealth, 6000); // every 6s
  return () => clearInterval(interval);
}, []);

  const showInfo = () => {
    alert(
      "💡 To start the Colab runtime:\n\n1️⃣ Click 'Open Notebook'.\n2️⃣ In Colab, go to Runtime → Run all.\n3️⃣ Wait 2–3 minutes for setup.\n4️⃣ Then refresh this page to check again."
    );
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: "#1e293b",
        padding: "6px 12px",
        borderRadius: "10px",
        color: "white",
      }}
    >
      <strong>Colab:</strong>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div
            style={{
              width: "14px",
              height: "14px",
              border: "2px solid #ccc",
              borderTop: "2px solid #4ade80",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <span>Checking...</span>
        </div>
      ) : status === "running" ? (
        <span style={{ color: "#4ade80", fontWeight: "bold" }}>🟢 RUNNING</span>
      ) : (
        <span style={{ color: "#f87171", fontWeight: "bold" }}>🔴 STOPPED</span>
      )}

      {status === "stopped" && !loading && (
        <button
          onClick={() => window.open(COLAB_NOTEBOOK_URL, "_blank")}
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            padding: "4px 10px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Open Notebook
        </button>
      )}

      <button
        onClick={showInfo}
        title="How to start"
        style={{
          background: "transparent",
          border: "none",
          color: "#60a5fa",
          cursor: "pointer",
        }}
      >
        <Info size={16} />
      </button>

      <button
        onClick={checkColabHealth}
        title="Recheck"
        style={{
          background: "transparent",
          border: "none",
          color: "#60a5fa",
          cursor: "pointer",
        }}
      >
        <RefreshCw size={16} />
      </button>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ColabHealth;
