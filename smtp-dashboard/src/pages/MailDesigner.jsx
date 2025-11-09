import { useEffect, useRef, useState } from "react";
import EmailEditor from "react-email-editor";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaSave, FaDownload, FaTrash, FaCopy, FaEye } from 'react-icons/fa';

const API_BASE = "http://43.230.201.125:60025/mails";

export default function MailDesigner() {
  const emailEditorRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(API_BASE);
      setTemplates(res.data);
    } catch (err) {
      toast.error("Error loading templates!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = () => {
    emailEditorRef.current.editor.exportHtml(async ({ design, html }) => {
      const name = prompt("Enter template name:");
      if (!name) return;

      try {
        await axios.post(API_BASE, { name, html, design });
        toast.success("Template saved successfully!");
        fetchTemplates();
      } catch (err) {
        toast.error("Failed to save template");
      }
    });
  };

  const handleLoad = (id) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    emailEditorRef.current.editor.loadDesign(template.design);
    setSelectedTemplate(id);
    toast.info(`Template "${template.name}" loaded`);
  };

  const handleExport = () => {
    emailEditorRef.current.editor.exportHtml(({ html }) => {
      const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>${html}</body></html>`;
      const blob = new Blob([fullHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "email_template.html";
      a.click();
      toast.success("HTML exported successfully!");
    });
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    try {
      await axios.delete(`${API_BASE}/${selectedTemplate}`);
      toast.success("Template deleted successfully!");
      setSelectedTemplate("");
      fetchTemplates();
    } catch (err) {
      toast.error("Failed to delete template");
    }
  };

  const handleDuplicate = () => {
    emailEditorRef.current.editor.exportHtml(async ({ design, html }) => {
      const name = prompt("Enter name for duplicate template:");
      if (!name) return;

      try {
        await axios.post(API_BASE, { name, html, design });
        toast.success("Template duplicated successfully!");
        fetchTemplates();
      } catch (err) {
        toast.error("Failed to duplicate template");
      }
    });
  };

  const editorOptions = {
    appearance: {
      theme: "dark",
      panels: {
        tools: {
          dock: "left"
        }
      }
    },
    tools: {
      countdown: { enabled: true },
      form: { enabled: true },
      html: { enabled: true },
      spacer: { enabled: true },
    },
    features: {
      preheaderText: true,
      undoRedo: true,
      importExport: true,
      responsive: true,
      fontFamily: true,
      mergeTags: true,
      textEditor: {
        spellChecker: true,
        tables: true,
        cleanPaste: true,
      }
    },
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      <ToastContainer position="bottom-right" theme="dark" />
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wider flex items-center gap-2">
            <span className="text-3xl">✨</span> 
            Mail Template Studio
          </h1>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedTemplate}
              onChange={(e) => handleLoad(e.target.value)}
              className="bg-white/10 backdrop-blur-sm text-white rounded-lg px-4 py-2 border border-white/20 hover:bg-white/20 transition-all"
            >
              <option value="">Select Template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
                title="Save Template"
              >
                <FaSave /> Save
              </button>
              
              <button
                onClick={handleExport}
                className="btn-secondary flex items-center gap-2"
                title="Export HTML"
              >
                <FaDownload /> Export
              </button>

              <button
                onClick={handleDelete}
                className="btn-danger flex items-center gap-2"
                disabled={!selectedTemplate}
                title="Delete Template"
              >
                <FaTrash />
              </button>

              <button
                onClick={handleDuplicate}
                className="btn-secondary flex items-center gap-2"
                title="Duplicate Template"
              >
                <FaCopy />
              </button>

              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="btn-secondary flex items-center gap-2"
                title="Toggle Preview"
              >
                <FaEye />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden h-[85vh]">
          <EmailEditor
            ref={emailEditorRef}
            options={editorOptions}
            onLoad={() => toast.success("Editor loaded successfully!")}
            projectId={1234}
            minHeight="85vh"
          />
        </div>
      </div>

      <style jsx>{`
        .btn-primary {
          @apply bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-all;
        }
        .btn-secondary {
          @apply bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-semibold transition-all;
        }
        .btn-danger {
          @apply bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50;
        }
      `}</style>
    </div>
  );
}
