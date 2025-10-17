"use client";

import { useState } from "react";
import api from "@/lib/api";

export default function PreviewPage() {
  const [previewUrl, setPreviewUrl] = useState("");

const generatePreview = async () => {
  try {
    const res = await api.get("/api/generate-preview", {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    setPreviewUrl(url);
  } catch (error) {
    alert("Failed to generate preview");
  }
};


  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Preview Certificate</h1>

      <button
        onClick={generatePreview}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Generate Preview
      </button>

      {previewUrl && (
        <div className="mt-6">
          <iframe src={previewUrl} width="100%" height="600px"></iframe>
        </div>
      )}
    </div>
  );
}
