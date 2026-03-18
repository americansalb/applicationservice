"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
}

const STEPS = [
  { title: "Personal Info", description: "Tell us about yourself" },
  { title: "Experience", description: "Your background & skills" },
  { title: "Additional Info", description: "Final details" },
  { title: "Review & Submit", description: "Confirm your application" },
];

export default function ApplyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    resumeText: "",
    coverLetter: "",
    linkedIn: "",
    portfolio: "",
    yearsExp: "",
    startDate: "",
    referral: "",
    legallyAuth: "",
    additionalInfo: "",
  });

  useEffect(() => {
    fetch(`/api/jobs/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setJob(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (currentStep === 0) {
      if (!form.firstName.trim()) newErrors.firstName = "First name is required";
      if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!form.email.trim()) newErrors.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        newErrors.email = "Please enter a valid email";
      if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, jobId: params.id }),
      });
      if (res.ok) {
        setSubmitted(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-teal-700 font-medium">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Job not found</h2>
          <button onClick={() => router.push("/")} className="text-teal-600 hover:underline">
            Back to open roles
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-10 shadow-lg border border-gray-100 max-w-md text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for applying to <strong>{job.title}</strong>. We&apos;ll review your application and get back to you soon.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-800 transition-colors"
          >
            Back to Careers
          </button>
        </div>
      </div>
    );
  }

  const InputField = ({
    label,
    field,
    type = "text",
    required = false,
    placeholder = "",
  }: {
    label: string;
    field: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={form[field as keyof typeof form]}
        onChange={(e) => updateField(field, e.target.value)}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all ${
          errors[field] ? "border-red-300 bg-red-50" : "border-gray-300"
        }`}
      />
      {errors[field] && <p className="text-red-500 text-xs mt-1">{errors[field]}</p>}
    </div>
  );

  const TextArea = ({
    label,
    field,
    placeholder = "",
    rows = 4,
  }: {
    label: string;
    field: string;
    placeholder?: string;
    rows?: number;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={form[field as keyof typeof form]}
        onChange={(e) => updateField(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all resize-none"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-900 to-teal-800 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => router.back()} className="inline-flex items-center text-teal-300 hover:text-white text-sm mb-4 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold">Apply: {job.title}</h1>
          <p className="text-teal-200 text-sm mt-1">{job.department} &middot; {job.location}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((step, idx) => (
            <div key={idx} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    idx < currentStep
                      ? "bg-teal-600 text-white"
                      : idx === currentStep
                      ? "bg-teal-700 text-white ring-4 ring-teal-100"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {idx < currentStep ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-xs mt-2 hidden sm:block ${idx <= currentStep ? "text-teal-700 font-medium" : "text-gray-400"}`}>
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${idx < currentStep ? "bg-teal-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-teal-900 mb-1">{STEPS[currentStep].title}</h2>
          <p className="text-gray-500 text-sm mb-6">{STEPS[currentStep].description}</p>

          {/* Step 1: Personal Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="First Name" field="firstName" required placeholder="John" />
                <InputField label="Last Name" field="lastName" required placeholder="Doe" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="Email" field="email" type="email" required placeholder="john@example.com" />
                <InputField label="Phone" field="phone" type="tel" required placeholder="(555) 123-4567" />
              </div>
              <InputField label="Street Address" field="address" placeholder="123 Main St" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InputField label="City" field="city" placeholder="Washington" />
                <InputField label="State" field="state" placeholder="DC" />
                <InputField label="Zip Code" field="zipCode" placeholder="20001" />
              </div>
            </div>
          )}

          {/* Step 2: Experience */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <TextArea label="Resume / Work Experience" field="resumeText" placeholder="Paste your resume or describe your relevant work experience..." rows={6} />
              <TextArea label="Cover Letter (Optional)" field="coverLetter" placeholder="Tell us why you're interested in this role and what makes you a great fit..." rows={5} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField label="LinkedIn Profile" field="linkedIn" placeholder="https://linkedin.com/in/yourprofile" />
                <InputField label="Portfolio / Website" field="portfolio" placeholder="https://yoursite.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <select
                  value={form.yearsExp}
                  onChange={(e) => updateField("yearsExp", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Additional */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <InputField label="Earliest Start Date" field="startDate" type="date" />
              <InputField label="How did you hear about this position?" field="referral" placeholder="e.g., LinkedIn, referral, job board..." />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Are you legally authorized to work in the United States?
                </label>
                <select
                  value={form.legallyAuth}
                  onChange={(e) => updateField("legallyAuth", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>
              <TextArea label="Anything else you'd like us to know?" field="additionalInfo" placeholder="Any additional information..." rows={4} />
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
                <h3 className="font-semibold text-teal-900 mb-3">Personal Information</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="text-gray-900">{form.firstName} {form.lastName}</span>
                  <span className="text-gray-500">Email</span>
                  <span className="text-gray-900">{form.email}</span>
                  <span className="text-gray-500">Phone</span>
                  <span className="text-gray-900">{form.phone}</span>
                  {form.city && (
                    <>
                      <span className="text-gray-500">Location</span>
                      <span className="text-gray-900">{form.city}{form.state ? `, ${form.state}` : ""} {form.zipCode}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
                <h3 className="font-semibold text-teal-900 mb-3">Experience</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {form.yearsExp && (
                    <>
                      <span className="text-gray-500">Years of Experience</span>
                      <span className="text-gray-900">{form.yearsExp}</span>
                    </>
                  )}
                  {form.linkedIn && (
                    <>
                      <span className="text-gray-500">LinkedIn</span>
                      <span className="text-gray-900 truncate">{form.linkedIn}</span>
                    </>
                  )}
                  <span className="text-gray-500">Resume</span>
                  <span className="text-gray-900">{form.resumeText ? "Provided" : "Not provided"}</span>
                  <span className="text-gray-500">Cover Letter</span>
                  <span className="text-gray-900">{form.coverLetter ? "Provided" : "Not provided"}</span>
                </div>
              </div>
              <div className="bg-teal-50 rounded-xl p-5 border border-teal-100">
                <h3 className="font-semibold text-teal-900 mb-3">Additional Details</h3>
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  {form.startDate && (
                    <>
                      <span className="text-gray-500">Start Date</span>
                      <span className="text-gray-900">{form.startDate}</span>
                    </>
                  )}
                  {form.legallyAuth && (
                    <>
                      <span className="text-gray-500">Work Authorization</span>
                      <span className="text-gray-900">{form.legallyAuth}</span>
                    </>
                  )}
                  {form.referral && (
                    <>
                      <span className="text-gray-500">Referral Source</span>
                      <span className="text-gray-900">{form.referral}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentStep === 0
                  ? "text-gray-300 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Back
            </button>
            {currentStep < STEPS.length - 1 ? (
              <button
                onClick={nextStep}
                className="bg-teal-700 text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-teal-700 text-white px-8 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
