"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewOrganizationPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    address: "",
    contactName: "",
    contactEmail: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const token = localStorage.getItem("aalb_partners_token");
    try {
      const res = await fetch("/api/partners/admin/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        return;
      }
      router.replace(`/partners/admin/organizations/${data.id}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <header className="bg-[#00626F] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/partners/admin" className="text-white/70 hover:text-white text-sm">
            &larr; Back
          </Link>
          <h1 className="text-lg font-semibold mt-2">New Partner Organization</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form
          onSubmit={submit}
          className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
              Organization Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1.5">Address</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
              Primary Contact Name
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => setForm({ ...form, contactName: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
              Primary Contact Email
            </label>
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
            />
          </div>
          {error && <p className="text-sm text-[#E53E3E]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/partners/admin"
              className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-[#1A202C] text-sm font-medium hover:bg-[#F5F7FA]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-[#00626F] text-white text-sm font-semibold hover:bg-[#008B8B] disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
