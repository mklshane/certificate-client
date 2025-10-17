"use client";

import { useState } from "react";
import api from "@/lib/api";

export default function CertificateWizard() {
  const [step, setStep] = useState(1);

  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [emailColumn, setEmailColumn] = useState("");
  const [message, setMessage] = useState("");

  // ✅ Upload template
  const handleTemplateUpload = async () => {
    if (!templateFile) return setMessage("Please upload a template first!");

    const formData = new FormData();
    formData.append("file", templateFile);

    try {
      const res = await api.post("/api/upload-template", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setPlaceholders(res.data.placeholders);
      setMessage("Template uploaded!");
      setStep(2);
    } catch (err) {
      setMessage("Template upload failed");
    }
  };

  // ✅ Upload CSV
  const handleCSVUpload = async () => {
    if (!csvFile) return setMessage("Please upload a CSV first!");

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await api.post("/api/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setColumns(res.data.columns);
      setMessage("CSV uploaded!");
      setStep(3);
    } catch (err) {
      setMessage("CSV upload failed");
    }
  };

  // ✅ Save mappings
  const saveMapping = async () => {
    if (!emailColumn) {
      setMessage("Please select the email column!");
      return;
    }

    try {
      const res = await api.post("/api/save-mapping", {
        mappings: mapping,
        emailColumn,
      });

      setMessage("Mapping saved successfully!");
    } catch (err) {
      setMessage("Error saving mapping");
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Certificate Setup</h1>

      {/* ✅ STEP 1 */}
      {step === 1 && (
        <div>
          <h2 className="font-semibold mb-2">1. Upload Template</h2>
          <input
            type="file"
            accept=".pdf,.ppt,.pptx"
            onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
            className="mb-4"
          />
          <button
            onClick={handleTemplateUpload}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Upload Template
          </button>
        </div>
      )}

      {/* ✅ STEP 2 */}
      {step === 2 && (
        <div>
          <h2 className="font-semibold mb-2">2. Upload CSV</h2>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="mb-4"
          />
          <button
            onClick={handleCSVUpload}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Upload CSV
          </button>
        </div>
      )}

      {/* ✅ STEP 3 */}
      {step === 3 && placeholders.length > 0 && columns.length > 0 && (
        <div>
          <h2 className="font-semibold mb-4">3. Map Fields</h2>
          {placeholders.map((ph, idx) => (
            <div key={idx} className="mb-3">
              <label className="block font-medium mb-1">{`<<${ph}>>:`}</label>
              <select
                className="border p-2 rounded w-full"
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    [ph]: e.target.value,
                  }))
                }
              >
                <option value="">Select column</option>
                {columns.map((col, i) => (
                  <option key={i} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div className="mt-4">
            <label className="block font-medium mb-1">Email Column:</label>
            <select
              className="border p-2 rounded w-full"
              onChange={(e) => setEmailColumn(e.target.value)}
            >
              <option value="">Select email column</option>
              {columns.map((col, i) => (
                <option key={i} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={saveMapping}
            className="bg-purple-600 text-white px-4 py-2 rounded mt-6"
          >
            Save Mapping
          </button>
        </div>
      )}

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
