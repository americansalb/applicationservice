"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.newPassword !== form.confirm) {
      setError("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("aalb_partners_token");
      const res = await fetch("/api/partners/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[#38A169]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#1A202C] mb-2">Password Changed</h2>
          <p className="text-sm text-[#1A202C]/60 mb-6">
            Your password has been updated. Please log in again.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("aalb_partners_token");
              router.replace("/partners");
            }}
            className="bg-[#00626F] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#008B8B]"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FA] px-4">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 max-w-md w-full">
        <Link href="/partners/dashboard" className="text-[#00626F] hover:text-[#008B8B] text-sm">
          &larr; Back
        </Link>
        <h1 className="text-lg font-semibold text-[#1A202C] mt-4 mb-1">Change Password</h1>
        <p className="text-sm text-[#1A202C]/60 mb-6">
          Minimum 10 characters with uppercase, lowercase, number, and special character.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1">Current Password</label>
            <input
              type="password"
              required
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1">New Password</label>
            <input
              type="password"
              required
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          {error && <p className="text-[#E53E3E] text-sm bg-red-50 p-3 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00626F] text-white py-3 rounded-lg font-semibold hover:bg-[#008B8B] disabled:opacity-50"
          >
            {loading ? "Updating..." : "Change Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
