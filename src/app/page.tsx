"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Step,
  WizardState,
  resetAuthTokens,
  getStoredFiles,
  validateMapping,
} from "@/lib/certificate-utils";
import CertificateHeader from "@/components/CertificateHeader";
import ProgressSection from "@/components/ProgressSection";
import LoginCard from "@/components/LoginCard";
import TemplateStep from "@/components/steps/TemplateStep";
import CSVStep from "@/components/steps/CSVStep";
import MappingStep from "@/components/steps/MappingStep";
import PreviewStep from "@/components/steps/PreviewStep";
import api from "@/lib/api";

const initialState: WizardState = {
  templateFile: null,
  csvFile: null,
  placeholders: [],
  columns: [],
  mapping: {},
  emailColumn: "",
  eventName: "Certificate Awarding Ceremony",
  senderName: "",
  emailSubject: "",
  emailBody: "",
  previewUrl: "",
  emailPreview: { subject: "", bodyPreview: "" },
  sending: false,
  sendMessage: "",
  needsGmailReauth: false,
  sentEmails: false,
  previewGenerated: false,
};

export default function CertificateWizard() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState<Step>(Step.TEMPLATE);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmailSubject, setTempEmailSubject] = useState("");
  const [tempEmailBody, setTempEmailBody] = useState("");

  // Wizard State
  const [state, setState] = useState<WizardState>(initialState);

  // Progress Bar
  useEffect(() => {
    setProgress(((step + 1) / 4) * 100);
  }, [step]);

  // State setters for individual properties
  const updateState = (updates: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const resetPreview = () => {
    updateState({
      previewUrl: "",
      previewGenerated: false,
      emailPreview: { subject: "", bodyPreview: "" },
    });
  };

  const previewEmailContent = async () => {
    if (
      !validateMapping(state.mapping, state.placeholders) ||
      !state.emailColumn ||
      !state.senderName.trim()
    )
      return;

    try {
      const res = await api.post("/api/preview-email", {
        mapping: state.mapping,
        emailColumn: state.emailColumn,
        eventName: state.eventName,
        senderName: state.senderName,
        emailSubject: isEditingEmail ? tempEmailSubject : state.emailSubject,
        emailBody: isEditingEmail ? tempEmailBody : state.emailBody,
      });
      updateState({ emailPreview: res.data });
    } catch (err) {
      console.error("Email preview error:", err);
    }
  };

  const startEditingEmail = () => {
    setTempEmailSubject(state.emailSubject);
    setTempEmailBody(state.emailBody);
    setIsEditingEmail(true);
  };

  const saveEmailEdits = async () => {
    updateState({
      emailSubject: tempEmailSubject,
      emailBody: tempEmailBody,
    });
    setIsEditingEmail(false);
    await previewEmailContent();
  };

  const cancelEmailEdits = () => {
    setIsEditingEmail(false);
    setTempEmailSubject("");
    setTempEmailBody("");
  };

  const clearAuthTokensAndReauth = () => {
    resetAuthTokens();
    updateState({ needsGmailReauth: false });
    signOut({ callbackUrl: "/" });
  };

  const resetEmailState = () => {
    updateState({ sentEmails: false, sendMessage: "" });
  };

  // Render Wizard Steps
  const renderStepContent = () => {
    const stepProps = {
      state,
      updateState,
      error,
      setError,
      uploading,
      setUploading,
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
      session,
      setStep,
      step,
    };

    switch (step) {
      case Step.TEMPLATE:
        return <TemplateStep {...stepProps} />;
      case Step.CSV:
        return <CSVStep {...stepProps} />;
      case Step.MAPPING:
        return <MappingStep {...stepProps} />;
      case Step.PREVIEW:
        return <PreviewStep {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8 px-3 sm:px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <CertificateHeader status={status} session={session} />

        {status === "authenticated" ? (
          <>
            <ProgressSection step={step} progress={progress} />
            {renderStepContent()}
          </>
        ) : (
          <LoginCard />
        )}
      </div>
    </div>
  );
}
