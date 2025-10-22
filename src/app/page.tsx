"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [eventName, setEventName] = useState("Certificate Awarding Ceremony");
  const [previewUrl, setPreviewUrl] = useState("");
  const [emailPreview, setEmailPreview] = useState({
    subject: "",
    bodyPreview: "",
  });
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [needsGmailReauth, setNeedsGmailReauth] = useState(false);
  const [previewGenerated, setPreviewGenerated] = useState(false);

  // ====== Progress Bar ======
  useEffect(() => {
    setProgress(((step + 1) / 4) * 100);
  }, [step]);

  // ====== Reset Preview ======
  const resetPreview = () => {
    setPreviewUrl("");
    setPreviewGenerated(false);
    setSendMessage("");
    setEmailPreview({ subject: "", bodyPreview: "" });
  };

  // ====== Email Preview ======
  const previewEmailContent = async () => {
    if (!Object.values(mapping).every((v) => v) || !emailColumn) return;

    try {
      const res = await api.post("/api/preview-email", {
        mapping,
        emailColumn,
        eventName,
      });
      setEmailPreview(res.data);
    } catch (err) {
      console.error("Email preview error:", err);
    }
  };

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

  // ====== Save Mapping (UPDATED) ======
  const saveMapping = async () => {
    const storedTemplate = localStorage.getItem("templateFile") || "";
    const storedCsv = localStorage.getItem("csvFile") || "";

    await api.post("/api/save-mapping", {
      templateFile: storedTemplate,
      csvFile: storedCsv,
      mappings: mapping,
      emailColumn,
      eventName,
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
    setPreviewGenerated(true);
  };

  // ====== Clear Auth Tokens ======
  const clearAuthTokensAndReauth = () => {
    localStorage.removeItem("next-auth.callbackUrl");
    localStorage.removeItem("next-auth.session-token");
    localStorage.removeItem("__Secure-next-auth.session-token");
    setNeedsGmailReauth(false);
    signOut({ callbackUrl: "/certificates" });
  };

  // ====== Send Certificates (UPDATED) ======
  const sendCertificates = async () => {
    if (!session || !(session as any).accessToken) {
      setSendMessage("Please log in with Google first.");
      return;
    }

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
        eventName,
        accessToken: (session as any).accessToken,
      });

      setSendMessage(res.data.message);
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

  // ====== Step Titles ======
  const stepTitles = [
    {
      title: "Upload Template",
      description: "Choose your certificate template (PDF/PPT/PPTX)",
    },
    { title: "Upload CSV", description: "Upload recipient data in CSV format" },
    {
      title: "Map Fields",
      description: "Match template placeholders to CSV columns",
    },
    {
      title: "Preview & Send",
      description: "Review and send personalized certificates",
    },
  ];

  // ====== Render Steps ======
  const renderStepContent = () => {
    switch (step) {
      case Step.TEMPLATE:
        return (
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold">
                {stepTitles[step].title}
              </CardTitle>
              <CardDescription>{stepTitles[step].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="template">Certificate Template</Label>
                  <Input
                    id="template"
                    type="file"
                    accept=".pdf,.ppt,.pptx"
                    onChange={(e) =>
                      setTemplateFile(e.target.files?.[0] || null)
                    }
                  />
                </div>
                <Button
                  onClick={handleTemplateUpload}
                  disabled={!templateFile}
                  className="w-full"
                  size="lg"
                >
                  Continue to CSV Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case Step.CSV:
        return (
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold">
                {stepTitles[step].title}
              </CardTitle>
              <CardDescription>{stepTitles[step].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="csv">Recipient Data (CSV)</Label>
                  <Input
                    id="csv"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </div>
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
                    disabled={!csvFile}
                    className="flex-1"
                    size="lg"
                  >
                    Continue to Mapping
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case Step.MAPPING:
        return (
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold">
                {stepTitles[step].title}
              </CardTitle>
              <CardDescription>{stepTitles[step].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 🎉 EVENT NAME INPUT */}
              <div className="space-y-2">
                <Label className="font-medium">Event Name *</Label>
                <Input
                  placeholder="e.g., 2024 Graduation Ceremony"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="max-w-sm"
                />
                <p className="text-sm text-muted-foreground">
                  This appears in email subject and body
                </p>
              </div>

              {/* FIELD MAPPINGS */}
              <div className="space-y-6">
                {placeholders.map((ph, idx) => (
                  <div key={idx} className="space-y-2">
                    <Label className="font-medium">
                      Template Field:{" "}
                      <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                        {"<<" + ph + ">>"}
                      </code>
                    </Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={(e) =>
                        setMapping((prev) => ({
                          ...prev,
                          [ph]: e.target.value,
                        }))
                      }
                      value={mapping[ph] || ""}
                    >
                      <option value="">Select CSV column</option>
                      {columns.map((c, i) => (
                        <option key={i} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* EMAIL COLUMN */}
              <div className="space-y-2">
                <Label className="font-medium">Email Column *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

              <div className="flex gap-3">
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
                    Object.values(mapping).some((v) => !v) ||
                    !emailColumn ||
                    !eventName.trim()
                  }
                  className="flex-1"
                  size="lg"
                >
                  Continue to Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case Step.PREVIEW:
        return (
          <Card className="border-0 shadow-xl">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold">
                {stepTitles[step].title}
              </CardTitle>
              <CardDescription>{stepTitles[step].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PDF PREVIEW BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={generatePreview}
                  disabled={previewGenerated}
                  variant={previewGenerated ? "outline" : "default"}
                  className="flex-1"
                >
                  {previewGenerated ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Preview Generated
                    </>
                  ) : (
                    "Generate PDF Preview"
                  )}
                </Button>
                {previewGenerated && (
                  <Button
                    onClick={resetPreview}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Generate New Preview
                  </Button>
                )}
              </div>

              {/* PDF PREVIEW */}
              {previewUrl && (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <iframe
                    src={previewUrl}
                    width="100%"
                    height="500px"
                    className="w-full"
                  />
                </div>
              )}

              {/* 🎉 EMAIL PREVIEW */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Email Preview
                  </CardTitle>
                  <CardDescription>
                    This is what recipients will receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="font-mono text-sm text-muted-foreground">
                      Subject:
                    </span>
                    <span className="font-medium">
                      {emailPreview.subject || "Click 'Preview Email'"}
                    </span>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-lg border border-blue-200/60">
                    <div className="prose prose-sm max-w-none">
                      <p className="font-semibold text-base mb-4">
                        Dear{" "}
                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-sm">
                          [Name]
                        </span>
                        ,
                      </p>
                      <p className="text-muted-foreground mb-6 leading-relaxed">
                        Congratulations on completing the{" "}
                        <strong className="text-blue-700">{eventName}</strong>!
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="font-semibold text-green-800 mb-2">
                          📎 Your Certificate is Attached
                        </p>
                        <p className="text-sm text-green-700">
                          Download and save your official certificate
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-6 mb-0 leading-relaxed">
                        Best regards,
                        <br />
                        <span className="font-semibold text-blue-700">
                          Certificate Wizard Team
                        </span>
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={previewEmailContent}
                    className="w-full"
                    disabled={
                      !Object.values(mapping).every((v) => v) || !emailColumn
                    }
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Refresh Email Preview
                  </Button>
                </CardContent>
              </Card>

              {/* ACTION BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(Step.MAPPING)}
                  className="flex-1"
                >
                  Back to Mapping
                </Button>
                <Button
                  onClick={sendCertificates}
                  disabled={sending || needsGmailReauth || !previewGenerated}
                  className="flex-1"
                  size="lg"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mr-2" />
                      Sending Certificates...
                    </>
                  ) : (
                    "Send All Certificates"
                  )}
                </Button>
              </div>

              {/* MESSAGES */}
              {sendMessage && (
                <Alert
                  className={
                    needsGmailReauth
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-green-200 bg-green-50 text-green-800"
                  }
                >
                  {needsGmailReauth ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{sendMessage}</AlertDescription>
                </Alert>
              )}

              {needsGmailReauth && (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                  <Button
                    variant="outline"
                    onClick={clearAuthTokensAndReauth}
                    className="w-full"
                  >
                    Re-login with Gmail Access
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Certificate Wizard
          </h1>
          <p className="max-w-3xl mx-auto text-xl text-muted-foreground">
            Generate and send personalized certificates in 4 simple steps
          </p>
        </div>

        {status === "authenticated" ? (
          <div className="space-y-8">
            {/* Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/20">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Step {step + 1} of 4
                  </p>
                  <p className="text-lg font-semibold mt-1">
                    {stepTitles[step].title}
                  </p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {stepTitles[step].description}
                </Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {renderStepContent()}

            {/* User Info */}
            <Card className="bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
              <CardContent className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={session?.user?.image ?? ""}
                    alt="Profile"
                    className="w-12 h-12 rounded-full ring-2 ring-white/50"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {session?.user?.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAuthTokensAndReauth}
                  >
                    Re-login
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => signOut()}
                  >
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm shadow-xl border-0">
            <CardContent className="pt-12 pb-10 text-center">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-lg">
                <span className="text-3xl font-bold text-white">🎓</span>
              </div>
              <CardTitle className="text-3xl font-bold mb-6">
                Welcome to Certificate Wizard
              </CardTitle>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed max-w-2xl mx-auto">
                Log in with Google to start creating and sending personalized
                certificates to your recipients automatically.
              </p>
              <Button
                size="lg"
                onClick={() =>
                  signIn("google", { callbackUrl: "/certificates" })
                }
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg h-12 text-lg font-semibold"
              >
                Get Started with Google
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
