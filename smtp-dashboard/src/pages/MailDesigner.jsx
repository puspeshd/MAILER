import { useEffect, useRef, useState } from "react";
import EmailEditor from "react-email-editor";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaRobot, FaSave, FaDownload, FaTrash, FaCopy, FaEye } from 'react-icons/fa';
import AIModal from "../components/AIModal";
const API_BASE = "http://43.230.201.125:60025/mails";

export default function MailDesigner() {
  const emailEditorRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
const [aiResult, setAiResult] = useState("");
const [isLoadingAI, setIsLoadingAI] = useState(false);
const [showPromptModal, setShowPromptModal] = useState(false);
const [tempPrompt, setTempPrompt] = useState("");
const [pendingAIAction, setPendingAIAction] = useState(null);
const [showAIPanel, setShowAIPanel] = useState(false);
 const [showAIModal, setShowAIModal] = useState(false);
 
const [initialPrompt, setInitialPrompt] = useState("");




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



const AI_API = "http://localhost:5000/generate"; // Flask AI bridge
const handleAIAssist = () => {
 emailEditorRef.current.editor.exportHtml(({ html }) => {
  if (!html) {
    alert("No content found in the editor!");
    return;
  }

  // Create a temporary DOM element
  const temp = document.createElement("div");
  temp.innerHTML = html;

  // Remove unwanted tags manually
  const tagsToRemove = ["style", "script", "meta", "title", "link", "head"];
  tagsToRemove.forEach(tag => {
    temp.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Extract visible text
  let text = temp.innerText
    .replace(/\s+/g, " ")          // collapse excessive whitespace
    .replace(/\n{2,}/g, "\n")      // normalize blank lines
    .replace(/[{}]/g, "")          // remove stray braces from CSS
    .replace(/@media[\s\S]*?}/g, "") // remove leftover media queries
    .trim();

  // Still too short or invalid?
  

  // Limit to avoid overloading AI
  text = text.slice(0, 4000);

  var cleanPrompt = `Please review and improve the following email:\n\n${text}`;
  if (!text || text.length < 5) {
    cleanPrompt = "Write down a professional mail on ......... "
    
  }
  setInitialPrompt(cleanPrompt);
  setShowAIModal(true);
});


};




const sendAIRequest = async () => {
  if (!aiPrompt.trim()) {
    toast.error("Prompt cannot be empty!");
    return;
  }

  setIsLoadingAI(true);
  setAiResult("");
  toast.info("🤖 AI is thinking...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await axios.post("https://puspeshd.pythonanywhere.com/generate", 
      { prompt: aiPrompt },
      { signal: controller.signal }
    );

    clearTimeout(timeout);
    if (res.data?.result) {
      setAiResult(res.data.result);
      toast.success("✅ AI completed successfully!");
    } else {
      toast.error("No result returned");
    }
  } catch (err) {
    if (axios.isCancel(err)) toast.error("AI request timed out (1.5 mins)");
    else toast.error("AI request failed");
  } finally {
    setIsLoadingAI(false);
  }
};







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
            
<button onClick={handleAIAssist} className="template-btn">
  🤖 AI Assist
</button>


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
  <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden h-[85vh] relative">
    {/* Email Editor */}
    <EmailEditor
      ref={emailEditorRef}
      options={editorOptions}
      onLoad={() => toast.success("Editor loaded successfully!")}
      projectId={1234}
      minHeight="85vh"
    />

  {showAIModal && (
  <AIModal
    onClose={() => setShowAIModal(false)}
    initialPrompt={initialPrompt}
  />
)}


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
      @keyframes fade-in-down {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-down {
  animation: fade-in-down 0.25s ease-out;
}
`
      }
      </style>
      {aiResult && (
  <div className="p-6 bg-gray-800 text-white rounded-lg shadow-xl m-6">
    <h2 className="text-xl font-semibold mb-3">🤖 AI Suggestions</h2>
    <textarea
      className="w-full h-40 bg-gray-900 text-white p-3 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      value={aiResult}
      readOnly
    />
    <div className="mt-3 text-sm text-gray-400">
      You can copy this and add it to your email above.
    </div>
  </div>
)}




    </div>
  );
}
