"use client";

import { useState } from "react";
import api from "@/lib/api";

export default function UploadTemplatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/upload-template", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(res.data.message);
      setPlaceholders(res.data.placeholders);
    } catch (err) {
      setMessage("Upload failed");
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">
        Upload Certificate Template
      </h1>

      <input
        type="file"
        accept=".pdf,.ppt,.pptx"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Upload
      </button>

      {message && <p className="mt-4">{message}</p>}

      {placeholders.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold">Detected Placeholders:</h2>
          <ul className="list-disc ml-5">
            {placeholders.map((p, idx) => (
              <li key={idx}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
