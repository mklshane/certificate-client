import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardState } from "@/lib/certificate-utils";
import api from "@/lib/api";

interface TemplateStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  error: string;
  setError: (error: string) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  setStep: (step: number) => void;
}

export default function TemplateStep({
  state,
  updateState,
  error,
  setError,
  uploading,
  setUploading,
  setStep,
}: TemplateStepProps) {
  const handleTemplateUpload = async () => {
    if (!state.templateFile) {
      setError("Please select a template file first");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", state.templateFile);

      const res = await api.post("/api/upload-template", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.placeholders) {
        updateState({ placeholders: res.data.placeholders });
        localStorage.setItem("templateFile", res.data.fileName);
        localStorage.setItem(
          "placeholders",
          JSON.stringify(res.data.placeholders)
        );
        setStep(1);
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
                updateState({ templateFile: e.target.files?.[0] || null });
                setError("");
              }}
              className="hidden"
              id="template-upload"
            />
            <label htmlFor="template-upload" className="cursor-pointer block">
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
                      {state.templateFile
                        ? state.templateFile.name
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
            disabled={!state.templateFile || uploading}
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
}
