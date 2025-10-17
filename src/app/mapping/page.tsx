"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function MappingPage() {
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [templateFile, setTemplateFile] = useState("");
  const [csvFile, setCsvFile] = useState("");
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [emailColumn, setEmailColumn] = useState("");
  const [message, setMessage] = useState("");

  // ✅ Load data from previous pages using localStorage (simple approach)
  useEffect(() => {
    const savedPlaceholders = localStorage.getItem("placeholders");
    const savedColumns = localStorage.getItem("columns");
    const savedTemplateFile = localStorage.getItem("templateFile");
    const savedCsvFile = localStorage.getItem("csvFile");

    if (savedPlaceholders) setPlaceholders(JSON.parse(savedPlaceholders));
    if (savedColumns) setColumns(JSON.parse(savedColumns));
    if (savedTemplateFile) setTemplateFile(savedTemplateFile);
    if (savedCsvFile) setCsvFile(savedCsvFile);
  }, []);

  const handleMappingChange = (placeholder: string, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [placeholder]: value,
    }));
  };

  const saveMapping = async () => {
    if (!emailColumn) {
      setMessage("Please select the email column!");
      return;
    }

    try {
      const res = await api.post("/api/save-mapping", {
        templateFile,
        csvFile,
        mappings: mapping,
        emailColumn,
      });
      setMessage("Mapping saved successfully!");
      console.log(res.data);
    } catch (err) {
      setMessage("Error saving mapping");
    }
  };

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Field Mapping</h1>

      {placeholders.length > 0 && columns.length > 0 ? (
        <div>
          {placeholders.map((ph, idx) => (
            <div key={idx} className="mb-3">
              <label className="block font-medium mb-1">{`<<${ph}>>:`}</label>
              <select
                className="border p-2 rounded w-full"
                onChange={(e) => handleMappingChange(ph, e.target.value)}
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
            className="bg-blue-600 text-white px-4 py-2 rounded mt-6"
          >
            Save Mapping
          </button>
        </div>
      ) : (
        <p className="text-gray-600">Waiting for uploaded data...</p>
      )}

      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
