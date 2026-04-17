"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("aalb_partners_token");
    if (!token) return;
    fetch("/api/partners/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        router.replace(data.role === "admin" ? "/partners/admin" : "/partners/dashboard");
      });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/partners/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      localStorage.setItem("aalb_partners_token", data.token);
      localStorage.setItem("aalb_partners_role", data.role);
      router.replace(data.role === "admin" ? "/partners/admin" : "/partners/dashboard");
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#F5F7FA]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#00626F] leading-tight">
            Americans Against<br />Language Barriers
          </h1>
          <p className="text-sm text-[#1A202C]/60 mt-3">Partner Intake Portal</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8">
          <h2 className="text-lg font-semibold text-[#1A202C] mb-1">Sign in</h2>
          <p className="text-sm text-[#1A202C]/60 mb-6">
            Access your institution&apos;s intake portal
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1A202C] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A202C] mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
              />
            </div>
            {error && (
              <p className="text-[#E53E3E] text-sm bg-red-50 p-3 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00626F] text-white py-3 rounded-lg font-semibold hover:bg-[#008B8B] transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <p className="text-center mt-3">
              <a href="/partners/reset-password" className="text-[#00626F] text-sm hover:underline">
                Forgot password?
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
