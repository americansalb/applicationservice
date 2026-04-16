export const SECTION_KEYS = [
  "hiring_requirements",
  "assessment_process",
  "continuing_education",
  "language_access_policies",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_META: Record<
  SectionKey,
  { number: number; title: string; description: string; uploadPrompt: string }
> = {
  hiring_requirements: {
    number: 1,
    title: "Interpreter Hiring Requirements",
    description:
      "Please describe what your institution looks for when hiring medical interpreters. This includes qualifications, credentials, experience requirements, and any other criteria you treat as must-haves or preferences. If you have a formal job posting or job description document, please upload it.",
    uploadPrompt:
      "Upload any job postings, job descriptions, or hiring criteria documents",
  },
  assessment_process: {
    number: 2,
    title: "Current Assessment & Interview Process",
    description:
      "We need to understand what your current process looks like when you identify a candidate you believe to be a good fit for an interpreter role. Do you conduct interviews? Do you already have any form of knowledge check, language proficiency assessment, or skills evaluation? If so, please describe it and upload any related materials.",
    uploadPrompt:
      "Upload any assessment forms, interview guides, scoring rubrics, or evaluation tools you currently use",
  },
  continuing_education: {
    number: 3,
    title: "Continuing Education Requirements",
    description:
      "Do your interpreters have any ongoing continuing education or training obligations once they are on staff? This includes any annual training hours, recertification requirements, competency re-evaluations, or professional development expectations.",
    uploadPrompt:
      "Upload any continuing education policies, training calendars, or competency evaluation forms",
  },
  language_access_policies: {
    number: 4,
    title: "Institutional Language Access Policies",
    description:
      "Please share your institution's language access policies. We are looking for documentation that governs how interpreters are used across the hospital, how clinical staff are trained to work with limited English proficient (LEP) and deaf/hard-of-hearing patients, and any protocols for when and how to engage interpreter services.",
    uploadPrompt:
      "Upload your language access plan, interpreter request protocols, staff training materials, or any related policies",
  },
};

export const STATUSES = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Under Review",
  "Needs Clarification",
  "Approved",
] as const;

export type SectionStatus = (typeof STATUSES)[number];
