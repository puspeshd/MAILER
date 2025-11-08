import React, { useRef, useState, useEffect } from "react";
import EmailEditor from "react-email-editor";
import axios from "axios";

export default function MailDesigner() {
  const emailEditorRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Load templates from Flask backend
  useEffect(() => {
    axios.get("http://43.230.201.125:60025/mails")
      .then(res => setTemplates(res.data))
      .catch(console.error);
  }, []);

  const exportHtml = () => {
    emailEditorRef.current.editor.exportHtml(async (data) => {
      const { design, html } = data;

      await axios.post("http://43.230.201.125:60025/mails", {
        name: prompt("Enter template name:"),
        html,
        design
      });

      alert("Template saved successfully!");
    });
  };

  const loadTemplate = (template) => {
    setSelectedTemplate(template.id);
    emailEditorRef.current.editor.loadDesign(template.design);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Email Template Designer</h1>

      <div className="mb-4">
        <button
          onClick={exportHtml}
          className="px-4 py-2 bg-blue-600 text-white rounded-md mr-2"
        >
          💾 Save Template
        </button>

        <select
          onChange={(e) => {
            const template = templates.find(t => t.id === e.target.value);
            if (template) loadTemplate(template);
          }}
          value={selectedTemplate || ""}
          className="px-2 py-1 border rounded-md"
        >
          <option value="">Load Saved Template</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="border rounded-md" style={{ height: "80vh" }}>
        <EmailEditor
          ref={emailEditorRef}
          onReady={() => console.log("Editor loaded")}
        />
      </div>
    </div>
  );
}
