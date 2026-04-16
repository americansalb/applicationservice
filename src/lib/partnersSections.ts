import { SectionKey } from "./partnersSchema";

export type FieldType =
  | "text"
  | "textarea"
  | "large_textarea"
  | "date"
  | "yes_no"
  | "yes_no_with_followup";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  followupLabel?: string;
  followupPlaceholder?: string;
}

export const SECTION_FIELDS: Record<SectionKey, Field[]> = {
  hiring_requirements: [
    {
      name: "languages",
      label: "Languages currently hiring interpreters for",
      type: "textarea",
    },
    { name: "education", label: "Minimum education requirements", type: "text" },
    {
      name: "certifications",
      label: "Required certifications or credentials (e.g., CCHI, NBCMI, RID, state-specific)",
      type: "text",
    },
    { name: "experience", label: "Minimum experience requirements", type: "text" },
    { name: "trainingHours", label: "Required training hours or program completion", type: "text" },
    {
      name: "otherCriteria",
      label: "Any other hiring criteria",
      type: "large_textarea",
    },
  ],
  assessment_process: [
    {
      name: "interviewProcess",
      label: "Describe your current interview process for interpreter candidates",
      type: "large_textarea",
    },
    {
      name: "languageProficiency",
      label: "Do you currently conduct any form of language proficiency assessment?",
      type: "yes_no_with_followup",
      followupLabel: "Please describe",
    },
    {
      name: "knowledgeAssessment",
      label: "Do you currently conduct any form of knowledge or competency assessment?",
      type: "yes_no_with_followup",
      followupLabel: "Please describe",
    },
    {
      name: "thirdPartyVendor",
      label: "Do you use a third-party vendor for any part of candidate evaluation?",
      type: "yes_no_with_followup",
      followupLabel: "Please describe, including vendor name",
    },
    {
      name: "otherEvaluation",
      label: "Any other evaluation steps in your current process",
      type: "large_textarea",
    },
  ],
  continuing_education: [
    {
      name: "requireCE",
      label: "Do you require continuing education for interpreters?",
      type: "yes_no_with_followup",
      followupLabel: "Describe the requirements (hours per year, topics, format)",
    },
    {
      name: "externalCerts",
      label: "Are interpreters required to maintain any external certifications?",
      type: "yes_no_with_followup",
      followupLabel: "Please describe",
    },
    {
      name: "periodicReeval",
      label: "Do you conduct periodic competency re-evaluations?",
      type: "yes_no_with_followup",
      followupLabel: "Describe frequency and format",
    },
    {
      name: "otherRequirements",
      label: "Any other ongoing requirements",
      type: "large_textarea",
    },
  ],
  language_access_policies: [
    {
      name: "hasWrittenPlan",
      label: "Do you have a written language access plan or policy?",
      type: "yes_no",
    },
    {
      name: "lastUpdated",
      label: "If yes, when was it last updated?",
      type: "date",
    },
    {
      name: "lepTraining",
      label: "Describe how clinical staff are trained to work with LEP patients",
      type: "large_textarea",
    },
    {
      name: "deafTraining",
      label: "Describe how clinical staff are trained to work with deaf/hard-of-hearing patients",
      type: "large_textarea",
    },
    {
      name: "requestProcess",
      label: "What is the process for a staff member to request an interpreter?",
      type: "large_textarea",
    },
    {
      name: "specialProtocols",
      label: "Are there any departments or service lines with special language access protocols?",
      type: "large_textarea",
    },
  ],
};
