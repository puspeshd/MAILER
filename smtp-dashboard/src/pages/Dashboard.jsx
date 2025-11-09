import React, { useState, useEffect } from "react";
import "./Dashboard.css";

const API_BASE_URL = "http://43.230.201.125:60025/";

function Modal({ children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">
          &times;
        </button>
        {children}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(true);
  
  return (
    <>
      <div className="section-header" onClick={() => setOpen(!open)}>
        {title}
        <span>{open ? "−" : "+"}</span>
      </div>
      {open && <div className="section-content">{children}</div>}
    </>
  );
}

export default function Dashboard() {
  const [containers, setContainers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [stats, setStats] = useState(null);
  const [logFilter, setLogFilter] = useState("");
  const [emailLogs, setEmailLogs] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsError, setEmailsError] = useState("");
  const [viewingMail, setViewingMail] = useState(null);

  const fetchContainers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}containers`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setContainers(data);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "Unknown error");
    }
  };

  const fetchStats = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}containers/stats/${id}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setErrorMsg(err.message || "Unknown error");
    }
  };

  const fetchEmailLogs = async (containerId) => {
    setEmailsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}containers/maildata/${containerId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEmailLogs(data);
      setEmailsError("");
    } catch (err) {
      setEmailsError(err.message || "Failed to load email logs");
      setEmailLogs([]);
    } finally {
      setEmailsLoading(false);
    }
  };

  const createContainer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}containers/create`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await fetchContainers();
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const deleteContainer = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}containers/delete/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (id === selectedId) {
        setSelectedId(null);
        setLogs("");
        setStats(null);
        setEmailLogs([]);
      }
      await fetchContainers();
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const viewLogs = async (id, filter = "") => {
    setSelectedId(id);
    setLogFilter(filter);
    try {
      const url = filter
        ? `${API_BASE_URL}containers/logs/${id}?filter=${filter}`
        : `${API_BASE_URL}containers/logs/${id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setLogs(data.logs);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "Unknown error");
      setLogs("");
    }
    fetchStats(id);
    fetchEmailLogs(id);
  };

  const sendEmails = async (id) => {
    setSendLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}containers/send-emails/${id}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      alert(`Emails Sent: ${data.sent_in_batch || "N/A"}\nTotal Sent: ${data.total_sent || "N/A"}\nOutput:\n${data.output}`);
      await fetchStats(id);
      await viewLogs(id, logFilter);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "Unknown error");
    } finally {
      setSendLoading(false);
    }
  };

  useEffect(() => {
    fetchContainers();
  }, []);

  const closeModal = () => {
    setSelectedId(null);
    setLogs("");
    setStats(null);
    setEmailLogs([]);
  };

  return (
    <div className="dashboard-container">
      <h1>CONTROLLER DASHBOARD</h1>

      <button disabled={loading || sendLoading} onClick={createContainer} className="btn">
        {loading ? "Creating..." : "Create New SMTP Container"}
      </button>

      {errorMsg && <p className="error-message">{errorMsg}</p>}

     
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Base Email</th>
            <th>User Count</th>
            <th>Uptime (min)</th>
            <th>Emails Sent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {containers.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", padding: 20 }}>
                No containers found.
              </td>
            </tr>
          ) : (
            containers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.status}</td>
                <td>{c.base_email}</td>
                <td>{c.user_count}</td>
                <td>{Math.floor(c.uptime_seconds/60)}</td>
                <td>{c.emails_sent}</td>
                <td>
                  <button onClick={() => viewLogs(c.id)} className="btn">View Logs</button>
                  <button onClick={() => sendEmails(c.id)} className="btn">Send Emails</button>
                  <button onClick={() => deleteContainer(c.id)} className="btn btn-delete">Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {selectedId && (
        <Modal onClose={closeModal}>
          {stats && (
            <CollapsibleSection title={`Container Stats for ${selectedId}`}>
              <p><strong>CPU:</strong> {stats.cpu_percent.toFixed(2)}%</p>
              <p><strong>Memory:</strong> {(stats.memory_usage / 1024 / 1024).toFixed(2)} MiB / {(stats.memory_limit / 1024 / 1024).toFixed(2)} MiB ({stats.memory_percent.toFixed(2)}%)</p>
              <p><strong>Uptime:</strong> {stats.uptime_seconds} seconds</p>
              <p><strong>Emails Sent:</strong> {stats.emails_sent}</p>
            </CollapsibleSection>
          )}

          <CollapsibleSection title="Logs">
            <pre>{logs || "No logs available."}</pre>
          </CollapsibleSection>

         <CollapsibleSection title="Email Logs">
  {emailsLoading && <p>Loading emails...</p>}
  {emailsError && <p style={{ color: "red" }}>{emailsError}</p>}
  {!emailsLoading && emailLogs.length === 0 && <p>No emails logged yet.</p>}

  {!emailsLoading && emailLogs.length > 0 && (
    <table className="table" style={{ marginTop: 10 }}>
      <thead>
        <tr>
          <th>Recipient</th>
          <th>Subject</th>
          <th>Status</th>
          <th>Timestamp</th>
          <th>Snippet</th>
          <th>View</th>
        </tr>
      </thead>
      <tbody>
        {emailLogs.map((mail, idx) => (
          <tr key={idx}>
            <td>{mail.to}</td>
            <td>{mail.subject}</td>
            <td>{mail.status}</td>
            <td>{new Date(mail.timestamp * 1000).toLocaleString()}</td>
            <td dangerouslySetInnerHTML={{ __html: mail.body_snippet }} />
            <td>
              <button
                className="btn"
                onClick={() => setViewingMail(mail)}
                title="View full mail"
              >
                ✉️
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )}

  {viewingMail && (
    <Modal onClose={() => setViewingMail(null)}>
      <h3>{viewingMail.subject}</h3>
      <p>
        <strong>To:</strong> {viewingMail.to}
      </p>
      <p>
        <strong>Status:</strong> {viewingMail.status}
      </p>
      <hr />
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          borderRadius: "5px",
          backgroundColor: "#fff",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
        dangerouslySetInnerHTML={{ __html: viewingMail.body_html || viewingMail.body_snippet }}
      />
    </Modal>
  )}
</CollapsibleSection>

        </Modal>
      )}
    </div>
  );
}
