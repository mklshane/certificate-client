import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardState } from "@/lib/certificate-utils";
import api from "@/lib/api";

interface CSVStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  error: string;
  setError: (error: string) => void;
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  setStep: (step: number) => void;
  step: number;
}

export default function CSVStep({
  state,
  updateState,
  error,
  setError,
  uploading,
  setUploading,
  setStep,
  step,
}: CSVStepProps) {
  const handleCSVUpload = async () => {
    if (!state.csvFile) {
      setError("Please select a CSV file first");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", state.csvFile);

      const res = await api.post("/api/upload-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.columns) {
        updateState({ columns: res.data.columns });
        localStorage.setItem("csvFile", res.data.fileName);
        localStorage.setItem("columns", JSON.stringify(res.data.columns));
        setStep(2);
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
                updateState({ csvFile: e.target.files?.[0] || null });
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
                      {state.csvFile ? state.csvFile.name : "Choose CSV file"}
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
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 font-medium rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </Button>
            <Button
              onClick={handleCSVUpload}
              disabled={!state.csvFile || uploading}
              className="flex-1 py-3 font-medium rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
            >
              {uploading ? "Uploading..." : "Continue to Mapping"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
