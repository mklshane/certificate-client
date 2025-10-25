import { Step } from "@/lib/certificate-utils";

interface StepIndicatorProps {
  stepNumber: number;
  currentStep: Step;
}

export default function StepIndicator({
  stepNumber,
  currentStep,
}: StepIndicatorProps) {
  const isCompleted = currentStep > stepNumber;
  const isActive = currentStep === stepNumber;

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
}
