import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardState, validateMapping } from "@/lib/certificate-utils";
import api from "@/lib/api";

interface MappingStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
  setStep: (step: number) => void;
  step: number;
}

export default function MappingStep({
  state,
  updateState,
  setStep,
  step,
}: MappingStepProps) {
  const saveMapping = async () => {
    const storedTemplate = localStorage.getItem("templateFile") || "";
    const storedCsv = localStorage.getItem("csvFile") || "";

    await api.post("/api/save-mapping", {
      templateFile: storedTemplate,
      csvFile: storedCsv,
      mappings: state.mapping,
      emailColumn: state.emailColumn,
      eventName: state.eventName,
      senderName: state.senderName,
      emailSubject: state.emailSubject,
      emailBody: state.emailBody,
    });

    setStep(3);
  };

  const handleMappingChange = (placeholder: string, column: string) => {
    updateState({
      mapping: {
        ...state.mapping,
        [placeholder]: column,
      },
    });
  };

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
              value={state.eventName}
              onChange={(e) => updateState({ eventName: e.target.value })}
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
              value={state.senderName}
              onChange={(e) => updateState({ senderName: e.target.value })}
            />
            <p className="text-xs text-gray-500">
              This appears as the email signature
            </p>
          </div>

          <div className="space-y-4">
            {state.placeholders.map((ph, idx) => (
              <div key={idx} className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">
                  Template Field:{" "}
                  <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono text-xs break-all">
                    {"<<" + ph + ">>"}
                  </code>
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                  onChange={(e) => handleMappingChange(ph, e.target.value)}
                  value={state.mapping[ph] || ""}
                >
                  <option value="">Select column</option>
                  {state.columns.map((c, i) => (
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
              onChange={(e) => updateState({ emailColumn: e.target.value })}
              value={state.emailColumn}
            >
              <option value="">Select email column</option>
              {state.columns.map((c, i) => (
                <option key={i} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 py-3 font-medium rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Back
            </Button>
            <Button
              onClick={saveMapping}
              disabled={
                !state.emailColumn ||
                !validateMapping(state.mapping, state.placeholders) ||
                !state.eventName.trim() ||
                !state.senderName.trim()
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
}
