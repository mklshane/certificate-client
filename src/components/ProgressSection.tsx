import { Step, stepLabels } from "@/lib/certificate-utils";
import StepIndicator from "./StepIndicator";

interface ProgressSectionProps {
  step: Step;
  progress: number;
}

export default function ProgressSection({
  step,
  progress,
}: ProgressSectionProps) {
  return (
    <div className="mb-6 sm:mb-8">
      {/* Mobile Step Indicator */}
      <div className="sm:hidden mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-900">
            Step {step + 1} of 4
          </span>
          <span className="text-sm text-gray-600">{stepLabels[step]}</span>
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
                  <StepIndicator stepNumber={stepNum} currentStep={step} />
                  <span
                    className={`text-sm font-medium ${
                      step >= stepNum ? "text-gray-900" : "text-gray-400"
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
          className="h-full bg-lime-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
