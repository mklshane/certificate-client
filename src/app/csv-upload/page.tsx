"use client";

import { useState } from "react";
import api from "@/lib/api";

export default function CSVUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a CSV file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(res.data.message);
      setColumns(res.data.columns);

      localStorage.setItem("csvFile", res.data.fileName);
      localStorage.setItem("columns", JSON.stringify(res.data.columns));

    } catch (err) {
      setMessage("CSV upload failed");
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Upload CSV Data</h1>

      <input
        type="file"
        accept=".csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Upload CSV
      </button>

      {message && <p className="mt-4">{message}</p>}

      {columns.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold">Detected Columns:</h2>
          <ul className="list-disc ml-5">
            {columns.map((c, idx) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
