"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import api from "@/lib/api";

enum Step {
  TEMPLATE = 0,
  CSV = 1,
  MAPPING = 2,
  PREVIEW = 3,
}

export default function CertificateWizard() {
  const [step, setStep] = useState<Step>(Step.TEMPLATE);
  const [progress, setProgress] = useState(0);

  // ========== Step Data ==========
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [emailColumn, setEmailColumn] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");

  // Update progress bar
  useEffect(() => {
    setProgress(((step + 1) / 4) * 100); // 4 total steps
  }, [step]);

  // ========== Step Handlers ==========

  const handleTemplateUpload = async () => {
    if (!templateFile) return;
    const formData = new FormData();
    formData.append("file", templateFile);

    const res = await api.post("/api/upload-template", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setPlaceholders(res.data.placeholders || []);
    localStorage.setItem("templateFile", res.data.fileName);
    localStorage.setItem("placeholders", JSON.stringify(res.data.placeholders));

    setStep(Step.CSV);
  };

  const handleCSVUpload = async () => {
    if (!csvFile) return;
    const formData = new FormData();
    formData.append("file", csvFile);

    const res = await api.post("/api/upload-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setColumns(res.data.columns || []);
    localStorage.setItem("csvFile", res.data.fileName);
    localStorage.setItem("columns", JSON.stringify(res.data.columns));

    setStep(Step.MAPPING);
  };

  const saveMapping = async () => {
    const storedTemplate = localStorage.getItem("templateFile") || "";
    const storedCsv = localStorage.getItem("csvFile") || "";

    await api.post("/api/save-mapping", {
      templateFile: storedTemplate,
      csvFile: storedCsv,
      mappings: mapping,
      emailColumn,
    });

    setStep(Step.PREVIEW);
  };

  const generatePreview = async () => {
    const res = await api.get("/api/generate-preview", {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  const sendCertificates = async () => {
    setSending(true);
    setSendMessage("");

    try {
      const storedTemplate = localStorage.getItem("templateFile") || "";
      const storedCsv = localStorage.getItem("csvFile") || "";

      const res = await api.post("/api/send-certificates", {
        templateFile: storedTemplate,
        csvFile: storedCsv,
        mapping,
        emailColumn,
      });

      setSendMessage(res.data.message);
    } catch (err: any) {
      setSendMessage("Failed to send certificates: " + err?.message || err);
    } finally {
      setSending(false);
    }
  };

  // ========== UI Render Functions ==========

  const renderStepContent = () => {
    switch (step) {
      case Step.TEMPLATE:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Upload Certificate Template</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx"
                onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                className="mb-4"
              />
              <Button onClick={handleTemplateUpload}>Next</Button>
            </CardContent>
          </Card>
        );

      case Step.CSV:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV Data</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="mb-4"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(Step.TEMPLATE)}
                >
                  Back
                </Button>
                <Button onClick={handleCSVUpload}>Next</Button>
              </div>
            </CardContent>
          </Card>
        );

      case Step.MAPPING:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Field Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              {placeholders.map((ph, idx) => (
                <div key={idx} className="mb-3">
                  <label className="block font-medium mb-1">{`<<${ph}>>:`}</label>
                  <select
                    className="border p-2 rounded w-full"
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [ph]: e.target.value }))
                    }
                  >
                    <option value="">Select column</option>
                    {columns.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
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
                  {columns.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(Step.CSV)}>
                  Back
                </Button>
                <Button onClick={saveMapping}>Next</Button>
              </div>
            </CardContent>
          </Card>
        );

      case Step.PREVIEW:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Preview & Send Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Button onClick={generatePreview}>Generate Preview</Button>
              </div>
              {previewUrl && (
                <iframe src={previewUrl} width="100%" height="400px" />
              )}

              <div className="mt-4">
                <p className="text-sm">
                  Email subject and body will be generated automatically based
                  on the certificate template and data.
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(Step.MAPPING)}>
                  Back
                </Button>
                <Button onClick={sendCertificates} disabled={sending}>
                  {sending ? "Sending..." : "Send Certificates"}
                </Button>
              </div>

              {sendMessage && <p className="mt-3 text-sm">{sendMessage}</p>}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Certificate Wizard</h1>
      <Progress value={progress} className="mb-6" />
      {renderStepContent()}
    </div>
  );
}
