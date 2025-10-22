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

  // ====== Wizard State ======
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{ [key: string]: string }>({});
  const [emailColumn, setEmailColumn] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [needsGmailReauth, setNeedsGmailReauth] = useState(false);

  // ====== Progress Bar ======
  useEffect(() => {
    setProgress(((step + 1) / 4) * 100);
  }, [step]);

  // ====== Upload Template ======
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

  // ====== Upload CSV ======
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

  // ====== Save Mapping ======
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

  // ====== Generate Preview ======
  const generatePreview = async () => {
    const res = await api.get("/api/generate-preview", {
      responseType: "blob",
    });

    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
  };

  // ====== Clear Auth Tokens & Force Re-auth ======
  const clearAuthTokensAndReauth = () => {
    // Clear NextAuth storage
    localStorage.removeItem("next-auth.callbackUrl");
    localStorage.removeItem("next-auth.session-token");
    localStorage.removeItem("__Secure-next-auth.session-token");

    setNeedsGmailReauth(false);
    signOut({ callbackUrl: "/certificates" });
  };

  // ====== Send Certificates (Gmail API) ======
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
        accessToken: (session as any).accessToken,
      });

      setSendMessage(res.data.message);
    } catch (err: any) {
      console.error("Send certificates error:", err);

      // ✅ Handle Gmail scope errors
      if (
        err?.response?.status === 403 &&
        (err?.response?.data?.includes("insufficientPermissions") ||
          err?.response?.data?.includes("insufficient authentication scopes") ||
          err?.message?.includes("Gmail permissions missing"))
      ) {
        setNeedsGmailReauth(true);
        setSendMessage(
          "🔒 Gmail permissions required. Please click 'Re-login with Gmail Access' below."
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

  // ====== Render Wizard Steps ======
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
              {/* ✅ Gmail Permissions Warning - Using div instead of Alert */}
              <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <span className="text-amber-500 text-lg">🔒</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-800 mb-2">
                      Gmail Access Required
                    </h4>
                    <p className="text-sm text-amber-700 mb-4">
                      This app needs permission to send emails on your behalf.
                      If you see permission errors below, click the button to
                      fix it.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAuthTokensAndReauth}
                      className="w-full sm:w-auto"
                    >
                      🔄 Re-login with Gmail Access
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Button onClick={generatePreview}>Generate Preview</Button>
              </div>
              {previewUrl && (
                <iframe
                  src={previewUrl}
                  width="100%"
                  height="400px"
                  className="border rounded-lg"
                />
              )}

              <div className="mt-6">
                <p className="text-sm text-muted-foreground">
                  📧 Email subject and body will be auto-generated based on your
                  CSV data.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setStep(Step.MAPPING)}
                  className="w-full sm:w-auto"
                >
                  ← Back to Mapping
                </Button>
                <Button
                  onClick={sendCertificates}
                  disabled={sending || needsGmailReauth}
                  className="w-full sm:w-auto"
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      📤 Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      ✉️ Send Certificates
                    </span>
                  )}
                </Button>
              </div>

              {/* ✅ Send Message - Using div instead of Alert */}
              {sendMessage && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    needsGmailReauth
                      ? "bg-amber-50 border-2 border-amber-200"
                      : "bg-green-50 border-2 border-green-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex-shrink-0 text-lg ${
                        needsGmailReauth ? "text-amber-500" : "text-green-500"
                      }`}
                    >
                      {needsGmailReauth ? "⚠️" : "✅"}
                    </span>
                    <p
                      className={`text-sm ${
                        needsGmailReauth ? "text-amber-800" : "text-green-800"
                      }`}
                    >
                      {sendMessage}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  // ====== MAIN RETURN ======
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Certificate Wizard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate & send personalized certificates in 4 easy steps
          </p>
        </div>

        {status === "authenticated" ? (
          <div className="flex items-center gap-3 bg-card p-3 rounded-lg border">
            <img
              src={session?.user?.image ?? ""}
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <span className="text-sm font-medium max-w-[150px] truncate">
              {session?.user?.name}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAuthTokensAndReauth}
            >
              🔓 Re-login
            </Button>
            <Button variant="destructive" size="sm" onClick={() => signOut()}>
              Logout
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => signIn("google", { callbackUrl: "/certificates" })}
            className="w-full sm:w-auto"
          >
            🔐 Login with Google
          </Button>
        )}
      </div>

      {status === "authenticated" ? (
        <>
          <Progress value={progress} className="mb-8 h-2" />
          {renderStepContent()}
        </>
      ) : (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-10 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <CardTitle className="text-2xl mb-4">
              Welcome to Certificate Wizard
            </CardTitle>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
              Log in with Google to start creating and sending personalized
              certificates to your recipients automatically.
            </p>
            <Button
              size="lg"
              onClick={() => signIn("google", { callbackUrl: "/certificates" })}
              className="w-full"
            >
              🚀 Get Started with Google
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
