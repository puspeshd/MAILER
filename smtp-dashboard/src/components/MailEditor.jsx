import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import axios from "axios";

export default function MailEditor({ mailData, onSaveSuccess }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (mailData) {
      setTitle(mailData.title);
      setContent(mailData.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [mailData]);

  const handleSave = async () => {
    try {
      if (mailData) {
        await axios.put(`/api/mails/${mailData.id}`, { title, content });
      } else {
        await axios.post("/api/mails", { title, content });
      }
      onSaveSuccess();
    } catch (err) {
      console.error("Error saving mail:", err);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <input
        type="text"
        className="border p-2 w-full mb-4"
        placeholder="Enter Email Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <ReactQuill theme="snow" value={content} onChange={setContent} />
      <button
        className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
        onClick={handleSave}
      >
        Save
      </button>
    </div>
  );
}
