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

  // ====== Wizard State ======
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

  // NEW: Email editing state
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmailSubject, setTempEmailSubject] = useState("");
  const [tempEmailBody, setTempEmailBody] = useState("");

  // ====== Progress Bar ======
  useEffect(() => {
    setProgress(((step + 1) / 4) * 100);
  }, [step]);

  // ====== Reset Preview ======
  const resetPreview = () => {
    setPreviewUrl("");
    setPreviewGenerated(false);
    setEmailPreview({ subject: "", bodyPreview: "" });
  };

  // ====== Email Preview ======
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

  // ====== Start Editing Email ======
  const startEditingEmail = () => {
    setTempEmailSubject(emailSubject);
    setTempEmailBody(emailBody);
    setIsEditingEmail(true);
  };

  // ====== Save Email Edits ======
  const saveEmailEdits = async () => {
    setEmailSubject(tempEmailSubject);
    setEmailBody(tempEmailBody);
    setIsEditingEmail(false);
    // Refresh preview with new content
    await previewEmailContent();
  };

  // ====== Cancel Email Edits ======
  const cancelEmailEdits = () => {
    setIsEditingEmail(false);
    setTempEmailSubject("");
    setTempEmailBody("");
  };

  // ====== Upload Template ======
  const handleTemplateUpload = async () => {
    if (!templateFile) {
      setError("Please select a template file first");
      return;
    }

    setUploading(true);
    setError("");

    try {
      console.log("Uploading template:", templateFile.name);

      const formData = new FormData();
      formData.append("file", templateFile);

      const res = await api.post("/api/upload-template", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Upload response:", res.data);

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

  // ====== Upload CSV ======
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

  // ====== Save Mapping ======
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

  // ====== Generate Preview ======
  const generatePreview = async () => {
    try {
      const res = await api.get("/api/generate-preview", {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewGenerated(true);

      // Generate email preview when PDF is generated
      await previewEmailContent();
    } catch (err) {
      console.error("Preview generation error:", err);
      setError("Failed to generate preview. Please check your mapping.");
    }
  };

  // ====== Clear Auth Tokens & Force Re-auth ======
  const clearAuthTokensAndReauth = () => {
    localStorage.removeItem("next-auth.callbackUrl");
    localStorage.removeItem("next-auth.session-token");
    localStorage.removeItem("__Secure-next-auth.session-token");
    setNeedsGmailReauth(false);
    signOut({ callbackUrl: "/" });
  };

  // ====== Send Certificates ======
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
          "Gmail permissions required. Please click 'Re-login with Gmail Access' below."
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

  // ====== Reset Email State ======
  const resetEmailState = () => {
    setSentEmails(false);
    setSendMessage("");
  };

  // ====== Render Wizard Steps ======
  const renderStepContent = () => {
    switch (step) {
      case Step.TEMPLATE:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Upload Certificate Template
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Upload your PDF or PowerPoint certificate template
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
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
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {templateFile
                          ? templateFile.name
                          : "Choose template file"}
                      </span>
                      <span className="text-xs text-gray-500">
                        PDF, PPT, or PPTX files
                      </span>
                    </div>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <Button
                  onClick={handleTemplateUpload}
                  disabled={!templateFile || uploading}
                  className="w-full"
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
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Upload Recipient Data
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Upload CSV file containing recipient information
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
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
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-gray-600"
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
                      <span className="text-sm font-medium text-gray-700">
                        {csvFile ? csvFile.name : "Choose CSV file"}
                      </span>
                      <span className="text-xs text-gray-500">
                        CSV files with recipient data
                      </span>
                    </div>
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Step.TEMPLATE)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCSVUpload}
                    disabled={!csvFile || uploading}
                    className="flex-1"
                  >
                    {uploading ? "Uploading..." : "Continue to Field Mapping"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case Step.MAPPING:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Map Fields
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Match template placeholders with your CSV columns
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Event Name Input */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="e.g., 2024 Graduation Ceremony"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    This will appear in email subject: "Your [Event Name]
                    Certificate"
                  </p>
                </div>

                {/* Sender Name Input */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700">
                    Your Name (Email Signature) *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                    placeholder="e.g., John Doe"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    This appears as "Best regards, [Your Name]" in emails
                  </p>
                </div>

                <div className="grid gap-4">
                  {placeholders.map((ph, idx) => (
                    <div key={idx} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Template Field:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {"<<" + ph + ">>"}
                        </code>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
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

                <div className="border-t pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Column *
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
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

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Step.CSV)}
                    className="flex-1"
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
                    className="flex-1"
                  >
                    Continue to Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case Step.PREVIEW:
        return (
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">
                Preview & Send Certificates
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Review your certificate and email preview before sending
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
                    className="flex-1"
                  >
                    {previewGenerated
                      ? "Preview Generated"
                      : "Generate PDF Preview"}
                  </Button>
                  {previewGenerated && (
                    <Button
                      onClick={resetPreview}
                      variant="outline"
                      className="flex-1"
                    >
                      Generate New Preview
                    </Button>
                  )}
                </div>

                {/* PDF Preview */}
                {previewUrl && (
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      src={previewUrl}
                      width="100%"
                      height="500px"
                      className="border-0"
                    />
                  </div>
                )}

                {/* Email Preview */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900">
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
                          >
                            Refresh Preview
                          </Button>
                          <Button
                            onClick={startEditingEmail}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
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
                            Edit Email
                          </Button>
                        </>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={saveEmailEdits}
                            size="sm"
                            className="flex items-center gap-1"
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Save
                          </Button>
                          <Button
                            onClick={cancelEmailEdits}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    {/* Email Subject */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-sm text-gray-500">
                        Subject:
                      </span>
                      {isEditingEmail ? (
                        <input
                          type="text"
                          className="flex-1 ml-4 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          value={tempEmailSubject}
                          onChange={(e) => setTempEmailSubject(e.target.value)}
                          placeholder={`Your ${eventName} Certificate`}
                        />
                      ) : (
                        <span className="font-medium text-gray-900">
                          {emailPreview.subject ||
                            "Your " + eventName + " Certificate"}
                        </span>
                      )}
                    </div>

                    {/* Email Body */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      {isEditingEmail ? (
                        <div className="space-y-4">
                          <textarea
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[200px] resize-y"
                            value={tempEmailBody}
                            onChange={(e) => setTempEmailBody(e.target.value)}
                            placeholder={`Dear <<name>>,\n\nCongratulations on completing ${eventName}!\n\nYour certificate is attached.\n\nBest regards,\n${senderName}`}
                          />
                          <div className="text-xs text-gray-500">
                            <p>
                              <strong>Placeholders you can use:</strong>
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {placeholders.map((ph) => (
                                <code
                                  key={ph}
                                  className="bg-blue-100 px-1 py-0.5 rounded text-xs"
                                >
                                  {"<<" + ph + ">>"}
                                </code>
                              ))}
                            </div>
                            <p className="mt-2">
                              Signature will be automatically added at the end.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 text-sm leading-relaxed whitespace-pre-line">
                          {emailPreview.bodyPreview ||
                            `Dear [Name],

Congratulations on completing the ${eventName}!

Your personalized certificate is attached to this email.

Please download and save it as your official record of achievement.

Thank you for your participation!

Best regards,
${senderName}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> Placeholders like{" "}
                    <code className="bg-gray-100 px-1 py-0.5 rounded">
                      {"<<"}name{">>"}
                    </code>{" "}
                    will be replaced with actual recipient data when sending.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep(Step.MAPPING)}
                    className="flex-1"
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
                      className="flex-1"
                    >
                      {sending
                        ? "Sending Certificates..."
                        : "Send Certificates"}
                    </Button>
                  ) : (
                    <Button
                      onClick={resetEmailState}
                      className="flex-1 bg-gray-800 hover:bg-gray-900"
                    >
                      Send Again
                    </Button>
                  )}
                </div>

                {sendMessage && (
                  <div
                    className={`rounded-lg p-4 ${
                      needsGmailReauth
                        ? "bg-amber-50 border border-amber-200"
                        : sentEmails
                        ? "bg-green-50 border border-green-200"
                        : "bg-red-50 border border-red-200"
                    }`}
                  >
                    <p
                      className={`text-sm ${
                        needsGmailReauth
                          ? "text-amber-800"
                          : sentEmails
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {sendMessage}
                    </p>
                  </div>
                )}

                {needsGmailReauth && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <Button
                      variant="outline"
                      onClick={clearAuthTokensAndReauth}
                      className="w-full"
                    >
                      Re-login with Gmail Access
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

  // ====== MAIN RETURN ======
  return (
    <div className="min-h-screen bg-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-light tracking-tight text-gray-900">
              Certify
            </h1>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <p className="text-sm text-gray-500 font-light">
              Generate and send personalized certificates in 4 easy steps
            </p>
          </div>

          {status === "authenticated" ? (
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <img
                src={session?.user?.image ?? ""}
                alt="Profile"
                className="w-9 h-9 rounded-full border border-gray-300"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 max-w-[140px] truncate">
                  {session?.user?.name}
                </span>
                <span className="text-xs text-gray-500">Active</span>
              </div>
              <div className="flex gap-1">
              
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="h-8 px-3 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                >
                  Logout
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full sm:w-auto bg-gray-900 text-white hover:bg-gray-800 border-0 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
            >
              <svg className="w-4 h-4 mr-3" viewBox="0 0 24 24">
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
            {/* Progress Section */}
            <div className="mb-12">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-900">
                  Progress
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="h-2 bg-gray-200" />
              <div className="flex justify-between text-xs text-gray-500 mt-3">
                <span
                  className={
                    step >= Step.TEMPLATE ? "text-gray-900 font-medium" : ""
                  }
                >
                  Template
                </span>
                <span
                  className={
                    step >= Step.CSV ? "text-gray-900 font-medium" : ""
                  }
                >
                  Data
                </span>
                <span
                  className={
                    step >= Step.MAPPING ? "text-gray-900 font-medium" : ""
                  }
                >
                  Mapping
                </span>
                <span
                  className={
                    step >= Step.PREVIEW ? "text-gray-900 font-medium" : ""
                  }
                >
                  Send
                </span>
              </div>
            </div>

            {/* Step Content */}
            {renderStepContent()}
          </>
        ) : (
          /* Login Card */
          <Card className="max-w-2xl mx-auto border border-gray-200 bg-white shadow-sm rounded-2xl">
            <CardContent className="pt-16 pb-16 text-center">
              <CardTitle className="text-3xl font-light text-gray-900 mb-4 tracking-tight">
                Certify
              </CardTitle>
              <p className="text-gray-600 mb-10 max-w-md mx-auto leading-relaxed text-base font-light">
                Securely create and send personalized certificates to your
                recipients through Gmail integration.
              </p>
              <Button
                size="lg"
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="bg-gray-900 text-white hover:bg-gray-800 border-0 px-8 py-3.5 rounded-xl text-base font-medium transition-all duration-200 hover:shadow-lg"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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
              <div className="mt-8 text-xs text-gray-400">
                Secure authentication • Gmail integration • Privacy focused
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
