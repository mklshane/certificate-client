import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardState } from "@/lib/certificate-utils";
import api from "@/lib/api";
import { signOut } from "next-auth/react";

interface PreviewStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  setStep: (step: number) => void;
  session: any;
  isEditingEmail: boolean;
  tempEmailSubject: string;
  tempEmailBody: string;
  setTempEmailSubject: (subject: string) => void;
  setTempEmailBody: (body: string) => void;
  startEditingEmail: () => void;
  saveEmailEdits: () => void;
  cancelEmailEdits: () => void;
  previewEmailContent: () => void;
  resetPreview: () => void;
  clearAuthTokensAndReauth: () => void;
  resetEmailState: () => void;
}

export default function PreviewStep({
  state,
  updateState,
  setStep,
  session,
  isEditingEmail,
  tempEmailSubject,
  tempEmailBody,
  setTempEmailSubject,
  setTempEmailBody,
  startEditingEmail,
  saveEmailEdits,
  cancelEmailEdits,
  previewEmailContent,
  resetPreview,
  clearAuthTokensAndReauth,
  resetEmailState,
}: PreviewStepProps) {
  const generatePreview = async () => {
    try {
      const res = await api.get("/api/generate-preview", {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      updateState({ previewUrl: url, previewGenerated: true });

      await previewEmailContent();
    } catch (err) {
      console.error("Preview generation error:", err);
      // You might want to set an error state here
    }
  };

  const sendCertificates = async () => {
    if (!session || !(session as any).accessToken) {
      alert("Please log in with Google first.");
      return;
    }

    updateState({ sending: true, sendMessage: "", needsGmailReauth: false });

    try {
      const storedTemplate = localStorage.getItem("templateFile") || "";
      const storedCsv = localStorage.getItem("csvFile") || "";

      const res = await api.post("/api/send-certificates", {
        templateFile: storedTemplate,
        csvFile: storedCsv,
        mapping: state.mapping,
        emailColumn: state.emailColumn,
        eventName: state.eventName,
        senderName: state.senderName,
        emailSubject: isEditingEmail ? tempEmailSubject : state.emailSubject,
        emailBody: isEditingEmail ? tempEmailBody : state.emailBody,
        accessToken: (session as any).accessToken,
      });

      updateState({ sendMessage: res.data.message, sentEmails: true });
    } catch (err: any) {
      console.error("Send certificates error:", err);

      if (
        err?.response?.status === 403 &&
        (err?.response?.data?.includes("insufficientPermissions") ||
          err?.response?.data?.includes("insufficient authentication scopes") ||
          err?.message?.includes("Gmail permissions missing"))
      ) {
        updateState({
          needsGmailReauth: true,
          sendMessage:
            "Gmail permissions required. Please re-authenticate with Gmail.",
        });
        return;
      }

      updateState({
        sendMessage:
          "Failed to send certificates: " +
          (err?.response?.data || err?.message || err),
      });
    } finally {
      updateState({ sending: false });
    }
  };

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
              disabled={state.previewGenerated}
              variant={state.previewGenerated ? "outline" : "default"}
              className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
            >
              {state.previewGenerated
                ? "Preview Generated"
                : "Generate PDF Preview"}
            </Button>
            {state.previewGenerated && (
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
          {state.previewUrl && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <iframe
                src={state.previewUrl}
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
                        !state.emailColumn ||
                        Object.keys(state.mapping).length === 0 ||
                        !state.senderName.trim()
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
                    placeholder={`Your ${state.eventName} Certificate`}
                  />
                ) : (
                  <span className="font-medium text-gray-900 flex-1 text-center sm:text-left break-words">
                    {state.emailPreview.subject ||
                      "Your " + state.eventName + " Certificate"}
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
                      placeholder={`Dear <<name>>,\n\nCongratulations on completing ${state.eventName}!\n\nYour certificate is attached.\n\nBest regards,\n${state.senderName}`}
                    />
                    <div className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Available placeholders:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {state.placeholders.map((ph) => (
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
                    {state.emailPreview.bodyPreview ||
                      `Dear [Name],

Congratulations on completing the ${state.eventName}!

Your personalized certificate is attached to this email.

Best regards,
${state.senderName}`}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Placeholders will be replaced with actual
              recipient data when sending.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1 py-3 font-medium rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back to Mapping
            </Button>

            {!state.sentEmails ? (
              <Button
                onClick={sendCertificates}
                disabled={
                  state.sending ||
                  state.needsGmailReauth ||
                  !state.previewGenerated ||
                  !state.senderName.trim() ||
                  (isEditingEmail &&
                    (!tempEmailSubject.trim() || !tempEmailBody.trim()))
                }
                className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors disabled:opacity-50"
              >
                {state.sending ? (
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

          {state.sendMessage && (
            <div
              className={`rounded-lg p-4 border text-sm font-medium ${
                state.needsGmailReauth
                  ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                  : state.sentEmails
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              <p className="break-words">{state.sendMessage}</p>
            </div>
          )}

          {state.needsGmailReauth && (
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
}
