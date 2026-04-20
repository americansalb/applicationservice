"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // Step 1: Request reset link
  if (!token) {
    const requestReset = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);
      try {
        const res = await fetch("/api/partners/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed");
          return;
        }
        setRequestSent(true);
      } finally {
        setLoading(false);
      }
    };

    if (requestSent) {
      return (
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[#1A202C] mb-2">Check Your Email</h2>
          <p className="text-sm text-[#1A202C]/60 mb-6">
            If an account exists with that email, we&apos;ve sent a password reset link.
            It expires in 1 hour.
          </p>
          <Link href="/partners" className="text-[#00626F] hover:text-[#008B8B] text-sm font-medium">
            Back to sign in
          </Link>
        </div>
      );
    }

    return (
      <>
        <h2 className="text-lg font-semibold text-[#1A202C] mb-1">Reset Password</h2>
        <p className="text-sm text-[#1A202C]/60 mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <form onSubmit={requestReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          {error && <p className="text-[#E53E3E] text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00626F] text-white py-3 rounded-lg font-semibold hover:bg-[#008B8B] disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
          <p className="text-center">
            <Link href="/partners" className="text-[#00626F] text-sm font-medium">
              Back to sign in
            </Link>
          </p>
        </form>
      </>
    );
  }

  // Step 2: Set new password with token
  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[#38A169]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-[#1A202C] mb-2">Password Updated</h2>
        <p className="text-sm text-[#1A202C]/60 mb-6">You can now sign in with your new password.</p>
        <Link
          href="/partners"
          className="bg-[#00626F] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#008B8B] inline-block"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/partners/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-lg font-semibold text-[#1A202C] mb-1">Set New Password</h2>
      <p className="text-sm text-[#1A202C]/60 mb-6">
        Minimum 10 characters with uppercase, lowercase, number, and special character.
      </p>
      <form onSubmit={resetPassword} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1A202C] mb-1">New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A202C] mb-1">Confirm Password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
          />
        </div>
        {error && <p className="text-[#E53E3E] text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#00626F] text-white py-3 rounded-lg font-semibold hover:bg-[#008B8B] disabled:opacity-50"
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 max-w-md w-full">
        <Suspense fallback={<div className="text-[#00626F] animate-pulse">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
