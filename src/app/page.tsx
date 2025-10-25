"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
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
  const { data: session, status } = useSession();
  const [step, setStep] = useState<Step>(Step.TEMPLATE);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Wizard State
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [emailColumn, setEmailColumn] = useState("");
  const [eventName, setEventName] = useState("Certificate Awarding Ceremony");
  const [senderName, setSenderName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [emailPreview, setEmailPreview] = useState({
    subject: "",
    bodyPreview: "",
  });
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [needsGmailReauth, setNeedsGmailReauth] = useState(false);
  const [sentEmails, setSentEmails] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);

  // Email editing state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmailSubject, setTempEmailSubject] = useState("");
  const [tempEmailBody, setTempEmailBody] = useState("");

  // Progress Bar
  useEffect(() => {
    setProgress(((step + 1) / 4) * 100);
  }, [step]);

  const resetPreview = () => {
    setPreviewUrl("");
    setPreviewGenerated(false);
    setEmailPreview({ subject: "", bodyPreview: "" });
  };

  const previewEmailContent = async () => {
    if (
      !Object.values(mapping).every((v) => v) ||
      !emailColumn ||
      !senderName.trim()
    )
      return;

    try {
      const res = await api.post("/api/preview-email", {
        mapping,
        emailColumn,
        eventName,
        senderName,
        emailSubject: isEditingEmail ? tempEmailSubject : emailSubject,
        emailBody: isEditingEmail ? tempEmailBody : emailBody,
      });
      setEmailPreview(res.data);
    } catch (err) {
      console.error("Email preview error:", err);
    }
  };

  const startEditingEmail = () => {
    setTempEmailSubject(emailSubject);
    setTempEmailBody(emailBody);
    setIsEditingEmail(true);
  };

  const saveEmailEdits = async () => {
    setEmailSubject(tempEmailSubject);
    setEmailBody(tempEmailBody);
    setIsEditingEmail(false);
    await previewEmailContent();
  };

  const cancelEmailEdits = () => {
    setIsEditingEmail(false);
    setTempEmailSubject("");
    setTempEmailBody("");
  };

  const handleTemplateUpload = async () => {
    if (!templateFile) {
      setError("Please select a template file first");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", templateFile);

      const res = await api.post("/api/upload-template", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.placeholders) {
        setPlaceholders(res.data.placeholders);
        localStorage.setItem("templateFile", res.data.fileName);
        localStorage.setItem(
          "placeholders",
          JSON.stringify(res.data.placeholders)
        );
        setStep(Step.CSV);
        setError("");
      } else {
        setError("No placeholders found in template. Please check your file.");
      }
    } catch (err: any) {
      console.error("Template upload error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload template. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      setError("Please select a CSV file first");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await api.post("/api/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.columns) {
        setColumns(res.data.columns);
        localStorage.setItem("csvFile", res.data.fileName);
        localStorage.setItem("columns", JSON.stringify(res.data.columns));
        setStep(Step.MAPPING);
        setError("");
      } else {
        setError("No columns found in CSV file. Please check your file.");
      }
    } catch (err: any) {
      console.error("CSV upload error:", err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to upload CSV. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const saveMapping = async () => {
    const storedTemplate = localStorage.getItem("templateFile") || "";
    const storedCsv = localStorage.getItem("csvFile") || "";

    await api.post("/api/save-mapping", {
      templateFile: storedTemplate,
      csvFile: storedCsv,
      mappings: mapping,
      emailColumn,
      eventName,
      senderName,
      emailSubject,
      emailBody,
    });

    setStep(Step.PREVIEW);
  };

  const generatePreview = async () => {
    try {
      const res = await api.get("/api/generate-preview", {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewGenerated(true);

      await previewEmailContent();
    } catch (err) {
      console.error("Preview generation error:", err);
      setError("Failed to generate preview. Please check your mapping.");
    }
  };

  const clearAuthTokensAndReauth = () => {
    localStorage.removeItem("next-auth.callbackUrl");
    localStorage.removeItem("next-auth.session-token");
    localStorage.removeItem("__Secure-next-auth.session-token");
    setNeedsGmailReauth(false);
    signOut({ callbackUrl: "/" });
  };

  const sendCertificates = async () => {
    if (!session || !(session as any).accessToken) {
      alert("Please log in with Google first.");
      return;
    }

    setSending(true);
    setSendMessage("");
    setNeedsGmailReauth(false);

    try {
      const storedTemplate = localStorage.getItem("templateFile") || "";
      const storedCsv = localStorage.getItem("csvFile") || "";

      const res = await api.post("/api/send-certificates", {
        templateFile: storedTemplate,
        csvFile: storedCsv,
        mapping,
        emailColumn,
        eventName,
        senderName,
        emailSubject: isEditingEmail ? tempEmailSubject : emailSubject,
        emailBody: isEditingEmail ? tempEmailBody : emailBody,
        accessToken: (session as any).accessToken,
      });

      setSendMessage(res.data.message);
      setSentEmails(true);
    } catch (err: any) {
      console.error("Send certificates error:", err);

      if (
        err?.response?.status === 403 &&
        (err?.response?.data?.includes("insufficientPermissions") ||
          err?.response?.data?.includes("insufficient authentication scopes") ||
          err?.message?.includes("Gmail permissions missing"))
      ) {
        setNeedsGmailReauth(true);
        setSendMessage(
          "Gmail permissions required. Please re-authenticate with Gmail."
        );
        return;
      }

      setSendMessage(
        "Failed to send certificates: " +
          (err?.response?.data || err?.message || err)
      );
    } finally {
      setSending(false);
    }
  };

  const resetEmailState = () => {
    setSentEmails(false);
    setSendMessage("");
  };

  // Modern Step Indicator - Mobile Responsive
  const StepIndicator = ({
    stepNumber,
    currentStep,
  }: {
    stepNumber: number;
    currentStep: Step;
  }) => {
    const isCompleted = step > stepNumber;
    const isActive = step === stepNumber;

    return (
      <div className="flex items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium transition-all duration-300 ${
            isCompleted
              ? "bg-gray-900 border-gray-900 text-white"
              : isActive
              ? "border-gray-900 bg-white text-gray-900"
              : "border-gray-300 text-gray-400 bg-white"
          }`}
        >
          {isCompleted ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            stepNumber + 1
          )}
        </div>
      </div>
    );
  };

  const stepLabels = ["Template", "Data", "Mapping", "Review"];

  // Render Wizard Steps
  const renderStepContent = () => {
    switch (step) {
      case Step.TEMPLATE:
        return (
          <Card className="border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Upload Certificate Template
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Upload your PDF, PPT, or PPTX certificate template
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="group">
                  <input
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={(e) => {
                      setTemplateFile(e.target.files?.[0] || null);
                      setError("");
                    }}
                    className="hidden"
                    id="template-upload"
                  />
                  <label
                    htmlFor="template-upload"
                    className="cursor-pointer block"
                  >
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center transition-all duration-200 group-hover:border-gray-400 bg-white">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                            />
                          </svg>
                        </div>
                        <div>
                          <span className="text-base font-medium text-gray-900 block">
                            {templateFile
                              ? templateFile.name
                              : "Choose template file"}
                          </span>
                          <span className="text-gray-500 text-sm">
                            PDF, PPT, or PPTX files supported
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleTemplateUpload}
                  disabled={!templateFile || uploading}
                  className="w-full py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 2v4m0 12v4m8-10h-4M6 12H2m15.364-7.364l-2.828 2.828M7.464 17.536l-2.828 2.828m0-11.314l2.828 2.828m11.314 0l2.828 2.828"
                        />
                      </svg>
                      Uploading...
                    </span>
                  ) : (
                    "Continue to Data Upload"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case Step.CSV:
        return (
          <Card className="border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Upload Recipient Data
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Upload CSV file containing recipient information
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="group">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      setCsvFile(e.target.files?.[0] || null);
                      setError("");
                    }}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer block">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center transition-all duration-200 group-hover:border-gray-400 bg-white">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                          <svg
                            className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <span className="text-base font-medium text-gray-900 block">
                            {csvFile ? csvFile.name : "Choose CSV file"}
                          </span>
                          <span className="text-gray-500 text-sm">
                            CSV files with recipient data
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Step.TEMPLATE)}
                    className="flex-1 py-3 font-medium rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCSVUpload}
                    disabled={!csvFile || uploading}
                    className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                  >
                    {uploading ? "Uploading..." : "Continue to Mapping"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case Step.MAPPING:
        return (
          <Card className="border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Map Fields
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Connect template fields with your data columns
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Event Name Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Event Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="e.g., 2024 Graduation Ceremony"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    This will appear in email subject lines
                  </p>
                </div>

                {/* Sender Name Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Your Name
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="e.g., John Doe"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    This appears as the email signature
                  </p>
                </div>

                <div className="space-y-4">
                  {placeholders.map((ph, idx) => (
                    <div key={idx} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-900">
                        Template Field:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono text-xs break-all">
                          {"<<" + ph + ">>"}
                        </code>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [ph]: e.target.value,
                          }))
                        }
                        value={mapping[ph] || ""}
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
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email Column
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    onChange={(e) => setEmailColumn(e.target.value)}
                    value={emailColumn}
                  >
                    <option value="">Select email column</option>
                    {columns.map((c, i) => (
                      <option key={i} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Step.CSV)}
                    className="flex-1 py-3 font-medium rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={saveMapping}
                    disabled={
                      !emailColumn ||
                      Object.keys(mapping).length !== placeholders.length ||
                      !eventName.trim() ||
                      !senderName.trim()
                    }
                    className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
                  >
                    Continue to Review
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case Step.PREVIEW:
        return (
          <Card className="border border-gray-200 shadow-sm rounded-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Review & Send
              </CardTitle>
              <p className="text-gray-600 text-sm">
                Preview everything before sending to recipients
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Preview Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={generatePreview}
                    disabled={previewGenerated}
                    variant={previewGenerated ? "outline" : "default"}
                    className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                  >
                    {previewGenerated
                      ? "Preview Generated"
                      : "Generate PDF Preview"}
                  </Button>
                  {previewGenerated && (
                    <Button
                      onClick={resetPreview}
                      variant="outline"
                      className="flex-1 py-3 font-medium rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Generate New Preview
                    </Button>
                  )}
                </div>

                {/* PDF Preview */}
                {previewUrl && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <iframe
                      src={previewUrl}
                      width="100%"
                      height="400px"
                      className="border-0 min-h-[400px]"
                    />
                  </div>
                )}

                {/* Email Preview */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Email Preview
                    </h3>
                    <div className="flex gap-2">
                      {!isEditingEmail ? (
                        <>
                          <Button
                            onClick={previewEmailContent}
                            variant="outline"
                            size="sm"
                            disabled={
                              !emailColumn ||
                              Object.keys(mapping).length === 0 ||
                              !senderName.trim()
                            }
                            className="text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Refresh
                          </Button>
                          <Button
                            onClick={startEditingEmail}
                            variant="outline"
                            size="sm"
                            className="text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Edit
                          </Button>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={saveEmailEdits}
                            size="sm"
                            className="text-sm font-medium bg-gray-900 hover:bg-gray-800 text-white"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={cancelEmailEdits}
                            variant="outline"
                            size="sm"
                            className="text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {/* Email Subject */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Subject:
                      </span>
                      {isEditingEmail ? (
                        <input
                          type="text"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors w-full"
                          value={tempEmailSubject}
                          onChange={(e) => setTempEmailSubject(e.target.value)}
                          placeholder={`Your ${eventName} Certificate`}
                        />
                      ) : (
                        <span className="font-medium text-gray-900 flex-1 text-center sm:text-left break-words">
                          {emailPreview.subject ||
                            "Your " + eventName + " Certificate"}
                        </span>
                      )}
                    </div>

                    {/* Email Body */}
                    <div className="bg-white rounded-lg p-4 border border-gray-300">
                      {isEditingEmail ? (
                        <div className="space-y-4">
                          <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors min-h-[120px] resize-y"
                            value={tempEmailBody}
                            onChange={(e) => setTempEmailBody(e.target.value)}
                            placeholder={`Dear <<name>>,\n\nCongratulations on completing ${eventName}!\n\nYour certificate is attached.\n\nBest regards,\n${senderName}`}
                          />
                          <div className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                              Available placeholders:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {placeholders.map((ph) => (
                                <code
                                  key={ph}
                                  className="bg-white px-2 py-1 rounded border border-gray-300 text-gray-700 font-mono text-xs break-all"
                                >
                                  {"<<" + ph + ">>"}
                                </code>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line text-gray-700 break-words">
                          {emailPreview.bodyPreview ||
                            `Dear [Name],

Congratulations on completing the ${eventName}!

Your personalized certificate is attached to this email.

Best regards,
${senderName}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Placeholders will be replaced with
                    actual recipient data when sending.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Step.MAPPING)}
                    className="flex-1 py-3 font-medium rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Back to Mapping
                  </Button>

                  {!sentEmails ? (
                    <Button
                      onClick={sendCertificates}
                      disabled={
                        sending ||
                        needsGmailReauth ||
                        !previewGenerated ||
                        !senderName.trim() ||
                        (isEditingEmail &&
                          (!tempEmailSubject.trim() || !tempEmailBody.trim()))
                      }
                      className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
                    >
                      {sending ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 animate-spin"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 2v4m0 12v4m8-10h-4M6 12H2m15.364-7.364l-2.828 2.828M7.464 17.536l-2.828 2.828m0-11.314l2.828 2.828m11.314 0l2.828 2.828"
                            />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        "Send Certificates"
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={resetEmailState}
                      className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
                    >
                      Send Again
                    </Button>
                  )}
                </div>

                {sendMessage && (
                  <div
                    className={`rounded-lg p-4 border text-sm font-medium ${
                      needsGmailReauth
                        ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                        : sentEmails
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    <p className="break-words">{sendMessage}</p>
                  </div>
                )}

                {needsGmailReauth && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <Button
                      variant="outline"
                      onClick={clearAuthTokensAndReauth}
                      className="w-full py-3 font-medium rounded-lg border-yellow-300 text-yellow-700 hover:bg-yellow-100 transition-colors"
                    >
                      Re-authenticate with Gmail
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // Main Return
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 sm:mb-12 gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Certify</h1>
                <p className="text-gray-600 text-xs sm:text-sm font-medium">
                  Create and send personalized certificates
                </p>
              </div>
            </div>
          </div>

          {status === "authenticated" ? (
            <div className="flex items-center gap-3 bg-white p-2 sm:p-3 rounded-full border border-gray-200 shadow-sm w-full sm:w-auto">
              <img
                src={session?.user?.image ?? ""}
                alt="Profile"
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-full"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-[140px]">
                  {session?.user?.name}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="h-6 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-full font-medium transition-colors shrink-0"
              >
                Logout
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-300 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-colors shadow-sm w-full sm:w-auto"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          )}
        </div>

        {status === "authenticated" ? (
          <>
            {/* Progress Section - Mobile Responsive */}
            <div className="mb-6 sm:mb-8">
              {/* Mobile Step Indicator */}
              <div className="sm:hidden mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Step {step + 1} of 4
                  </span>
                  <span className="text-sm text-gray-600">
                    {stepLabels[step]}
                  </span>
                </div>
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Desktop Step Indicator */}
              <div className="hidden sm:flex items-center justify-between mb-6">
                <div className="flex items-center gap-4 sm:gap-8">
                  {[Step.TEMPLATE, Step.CSV, Step.MAPPING, Step.PREVIEW].map(
                    (stepNum, index) => (
                      <div key={stepNum} className="flex items-center gap-4 sm:gap-8">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <StepIndicator
                            stepNumber={stepNum}
                            currentStep={step}
                          />
                          <span
                            className={`text-sm font-medium ${
                              step >= stepNum
                                ? "text-gray-900"
                                : "text-gray-400"
                            }`}
                          >
                            {stepLabels[index]}
                          </span>
                        </div>
                        {index < 3 && (
                          <div className="w-4 sm:w-8 h-0.5 bg-gray-300 rounded-full"></div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Desktop Progress Bar */}
              <div className="hidden sm:block bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gray-900 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            {/* Step Content */}
            {renderStepContent()}
          </>
        ) : (
          /* Login Card */
          <Card className="max-w-md mx-auto border border-gray-200 shadow-sm rounded-lg">
            <CardContent className="pt-8 sm:pt-12 pb-8 sm:pb-12 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <svg
                  className="w-6 h-6 sm:w-8 sm:h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>

              <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Certify
              </CardTitle>
              <p className="text-gray-600 text-xs sm:text-sm mb-6 sm:mb-8 max-w-sm mx-auto leading-relaxed px-2 sm:px-0">
                Create certificates and send them directly to your
                recipients through secure Gmail integration.
              </p>

              <Button
                size="lg"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="bg-white text-gray-900 hover:bg-gray-50 border border-gray-300 px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-colors shadow-sm w-full mb-4 sm:mb-6 mx-auto max-w-xs"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Get Started with Google
              </Button>

              <div className="flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4 text-xs text-gray-500 font-medium px-2">
                <span>Secure authentication</span>
                <span className="hidden sm:inline">•</span>
                <span>Gmail integration</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}