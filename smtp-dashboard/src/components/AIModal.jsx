import React, { useState, useRef, useEffect } from "react";
import "./AIModal.css";

export default function AIModal({ onClose, onRun, initialPrompt = "" }) {
  const [selectedAction, setSelectedAction] = useState("");
  const [prompt, setPrompt] = useState(initialPrompt);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const resultRef = useRef(null);

  // 🧠 Expanded preset options
  const presets = {
    "Fix grammar": "Fix grammar and spelling issues in the following text:",
    "Make formal": "Rewrite the following email in a formal and professional tone:",
    "Make friendly": "Rewrite this email to sound warm, positive, and conversational:",
    "Summarize": "Summarize the following email in 3 concise bullet points:",
    "Make concise": "Rewrite this email to be short, clear, and direct:",
    "Add subject line": "Suggest 3 good subject lines for the following email content:",
    "Polish tone": "Refine the tone of this email to make it polite and confident:",
    "Fix structure": "Improve the sentence structure and readability of the following email:",
    "Convert to reply": "Convert the following email into a polite and professional reply:",
    "Extract key points": "List the key points or action items from the following email:",
    "Summarize meeting notes": "Summarize the following meeting notes into clear points:",
    "Rewrite for clarity": "Rewrite the following email so it’s easier to understand:",
    "Generate follow-up": "Write a short follow-up email for this conversation:",
    "Translate to English": "Translate the following email into English clearly:",
  };

  const handleActionSelect = (e) => {
    const value = e.target.value;
    setSelectedAction(value);
    setPrompt(presets[value] || "");
  };

  const runAI = async () => {
    if (!prompt.trim()) return alert("Please enter a prompt first!");
    setLoading(true);
    setResult("");
    setError("");

    try {
      const res = await fetch("http://43.230.201.125:60025/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) throw new Error("Network error");
      const data = await res.json();

      if (data.result) setResult(data.result);
      else setResult("✅ Prompt sent! Check backend for final result.");

    } catch (err) {
      setError("❌ Failed to get AI response. Try again.");
    }

    setLoading(false);
  };

  // 🧭 Auto-scroll when result updates
  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  return (
    <div className="ai-modal-overlay">
      <div className="ai-modal-box">
        <div className="ai-modal-header">
          <h2>🤖 AI Assistant</h2>
          <button onClick={onClose}>✖</button>
        </div>

        <div className="ai-modal-body">
          <label>Choose Action:</label>
          <select value={selectedAction} onChange={handleActionSelect}>
            <option value="">-- Select preset --</option>
            {Object.keys(presets).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <label>Edit Prompt:</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write or modify your AI prompt..."
          />

          {loading ? (
            <div className="ai-loader">
              <div className="spinner"></div>
              <p>AI is thinking... this might take up to 90 seconds</p>
            </div>
          ) : (
            <button className="ai-run-btn" onClick={runAI}>
              Run AI
            </button>
          )}

          {result && (
            <div ref={resultRef} className="ai-result-block">
              <label>AI Result:</label>
              <div
                className="ai-result-text"
                dangerouslySetInnerHTML={{
                  __html: result.replace(/\n/g, "<br/>"),
                }}
              />
              <div className="ai-actions">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result);
                    alert("Copied!");
                  }}
                >
                  📋 Copy
                </button>
                <button onClick={() => setResult("")}>🔁 Try Again</button>
              </div>
            </div>
          )}

          {error && <p className="ai-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
