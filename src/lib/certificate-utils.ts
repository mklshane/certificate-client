export enum Step {
  TEMPLATE = 0,
  CSV = 1,
  MAPPING = 2,
  PREVIEW = 3,
}

export interface EmailPreview {
  subject: string;
  bodyPreview: string;
}

export interface WizardState {
  templateFile: File | null;
  csvFile: File | null;
  placeholders: string[];
  columns: string[];
  mapping: { [key: string]: string };
  emailColumn: string;
  eventName: string;
  senderName: string;
  emailSubject: string;
  emailBody: string;
  previewUrl: string;
  emailPreview: EmailPreview;
  sending: boolean;
  sendMessage: string;
  needsGmailReauth: boolean;
  sentEmails: boolean;
  previewGenerated: boolean;
}

export const stepLabels = ["Template", "Data", "Mapping", "Review"];

export const resetAuthTokens = () => {
  localStorage.removeItem("next-auth.callbackUrl");
  localStorage.removeItem("next-auth.session-token");
  localStorage.removeItem("__Secure-next-auth.session-token");
};

export const getStoredFiles = () => ({
  templateFile: localStorage.getItem("templateFile") || "",
  csvFile: localStorage.getItem("csvFile") || "",
});

export const validateMapping = (
  mapping: { [key: string]: string },
  placeholders: string[]
) => {
  return (
    Object.keys(mapping).length === placeholders.length &&
    Object.values(mapping).every((v) => v)
  );
};

export const initialState: WizardState = {
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
