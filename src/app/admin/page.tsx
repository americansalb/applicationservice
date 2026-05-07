"use client";

import { useEffect, useState } from "react";

interface Stats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  statusCounts: Record<string, number>;
  recentApplications: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    createdAt: string;
    job: { title: string };
  }>;
}

interface Application {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  job: { title: string; department: string };
}

interface InterviewSubmission {
  id: string;
  jobSlug: string;
  fullName: string;
  email: string;
  phone: string;
  location: string | null;
  linkedIn: string | null;
  yearsExp: string | null;
  answers: Record<string, string>;
  videoUrls: Record<string, { fileId: string; webViewLink: string }>;
  status: string;
  createdAt: string;
}

interface InterviewBooking {
  id: string;
  jobSlug: string;
  slotStart: string;
  fullName: string;
  email: string;
  phone: string;
  notes: string | null;
  createdAt: string;
}

interface VirtualRequest {
  id: string;
  jobSlug: string;
  fullName: string;
  email: string;
  phone: string | null;
  notes: string | null;
  contactedAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Reviewing: "bg-yellow-100 text-yellow-700",
  Interview: "bg-purple-100 text-purple-700",
  Offered: "bg-teal-100 text-teal-700",
  Hired: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<InterviewSubmission[]>([]);
  const [bookings, setBookings] = useState<InterviewBooking[]>([]);
  const [virtualRequests, setVirtualRequests] = useState<VirtualRequest[]>([]);
  const [view, setView] = useState<
    "dashboard" | "applications" | "postJob" | "interviews" | "bookings"
  >("dashboard");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const emptyJobForm = {
    title: "",
    department: "",
    location: "",
    type: "Full-time",
    salary: "",
    description: "",
    requirements: "",
    benefits: "",
  };
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [postingJob, setPostingJob] = useState(false);
  const [jobError, setJobError] = useState("");
  const [jobSuccess, setJobSuccess] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("aalb_admin_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchApplications();
    fetchInterviews();
    fetchBookings();
    fetchVirtualRequests();
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("aalb_admin_token", data.token);
        setToken(data.token);
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch {
      setLoginError("Connection error");
    } finally {
      setLoggingIn(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("aalb_admin_token");
    setToken(null);
    setStats(null);
    setApplications([]);
  };

  const fetchStats = async () => {
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setStats(await res.json());
  };

  const fetchApplications = async () => {
    const res = await fetch("/api/applications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setApplications(await res.json());
  };

  const fetchInterviews = async () => {
    const res = await fetch("/api/admin/interviews", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setInterviews(await res.json());
  };

  const fetchBookings = async () => {
    const res = await fetch("/api/admin/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setBookings(await res.json());
  };

  const fetchVirtualRequests = async () => {
    const res = await fetch("/api/admin/virtual-interview-requests", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setVirtualRequests(await res.json());
  };

  const toggleVirtualContacted = async (r: VirtualRequest) => {
    const next = !r.contactedAt;
    const res = await fetch(`/api/admin/virtual-interview-requests/${r.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ contacted: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Update failed");
      return;
    }
    setVirtualRequests((prev) =>
      prev.map((x) =>
        x.id === r.id
          ? { ...x, contactedAt: next ? new Date().toISOString() : null }
          : x
      )
    );
  };

  const deleteVirtualRequest = async (r: VirtualRequest) => {
    if (!window.confirm(`Delete virtual interview request from ${r.fullName}?`)) return;
    const res = await fetch(`/api/admin/virtual-interview-requests/${r.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Delete failed");
      return;
    }
    setVirtualRequests((prev) => prev.filter((x) => x.id !== r.id));
  };

  const cancelBooking = async (b: InterviewBooking) => {
    const when = new Date(b.slotStart).toLocaleString("en-US", {
      timeZone: "America/Mexico_City",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    if (
      !window.confirm(
        `Cancel ${b.fullName}'s booking on ${when}?\n\nThis frees up the slot. The candidate is NOT automatically notified.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/admin/bookings/${b.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Cancel failed");
      return;
    }
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
  };

  const submitJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostingJob(true);
    setJobError("");
    setJobSuccess("");
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jobForm),
      });
      const data = await res.json();
      if (res.ok) {
        setJobSuccess(`Job "${data.title}" posted successfully.`);
        setJobForm(emptyJobForm);
        fetchStats();
      } else {
        setJobError(data.error || "Failed to post job");
      }
    } catch {
      setJobError("Connection error");
    } finally {
      setPostingJob(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    fetchApplications();
    fetchStats();
  };

  // Login Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-teal-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-extrabold text-xl">A</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to manage applications</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="contact@aalb.org"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                placeholder="Enter your password"
              />
            </div>
            {loginError && (
              <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-teal-700 text-white py-3 rounded-lg font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {loggingIn ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-xs text-gray-400 text-center mt-6">
            AALB Staff Only
          </p>
        </div>
      </div>
    );
  }

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = filterStatus === "All" || app.status === filterStatus;
    const matchesSearch =
      searchQuery === "" ||
      `${app.firstName} ${app.lastName} ${app.email} ${app.job.title}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <div className="bg-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-bold">AALB Admin</h1>
              <div className="hidden sm:flex space-x-1 bg-teal-800 rounded-lg p-1">
                <button
                  onClick={() => setView("dashboard")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === "dashboard" ? "bg-teal-700 text-white" : "text-teal-300 hover:text-white"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView("applications")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === "applications" ? "bg-teal-700 text-white" : "text-teal-300 hover:text-white"
                  }`}
                >
                  Applications
                </button>
                <button
                  onClick={() => setView("postJob")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === "postJob" ? "bg-teal-700 text-white" : "text-teal-300 hover:text-white"
                  }`}
                >
                  Post Job
                </button>
                <button
                  onClick={() => setView("interviews")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === "interviews" ? "bg-teal-700 text-white" : "text-teal-300 hover:text-white"
                  }`}
                >
                  Interviews
                </button>
                <button
                  onClick={() => setView("bookings")}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    view === "bookings" ? "bg-teal-700 text-white" : "text-teal-300 hover:text-white"
                  }`}
                >
                  Bookings
                </button>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-teal-300 hover:text-white text-sm font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile view toggle */}
        <div className="sm:hidden flex space-x-1 bg-gray-200 rounded-lg p-1 mb-6">
          <button
            onClick={() => setView("dashboard")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "dashboard" ? "bg-white text-teal-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setView("applications")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "applications" ? "bg-white text-teal-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Applications
          </button>
          <button
            onClick={() => setView("postJob")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "postJob" ? "bg-white text-teal-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Post Job
          </button>
          <button
            onClick={() => setView("interviews")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "interviews" ? "bg-white text-teal-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Interviews
          </button>
          <button
            onClick={() => setView("bookings")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              view === "bookings" ? "bg-white text-teal-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Bookings
          </button>
        </div>

        {view === "dashboard" && stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total Applications</p>
                <p className="text-3xl font-bold text-teal-900">{stats.totalApplications}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Active Jobs</p>
                <p className="text-3xl font-bold text-teal-900">{stats.activeJobs}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">New</p>
                <p className="text-3xl font-bold text-blue-600">{stats.statusCounts["New"] || 0}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">In Review</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {(stats.statusCounts["Reviewing"] || 0) + (stats.statusCounts["Interview"] || 0)}
                </p>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Application Pipeline</h3>
                <div className="space-y-3">
                  {["New", "Reviewing", "Interview", "Offered", "Hired", "Rejected"].map((status) => {
                    const count = stats.statusCounts[status] || 0;
                    const pct = stats.totalApplications > 0 ? (count / stats.totalApplications) * 100 : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[status]} w-24 text-center`}>
                          {status}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-teal-500 rounded-full h-2 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Applications</h3>
                {stats.recentApplications.length === 0 ? (
                  <p className="text-gray-400 text-sm">No applications yet</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recentApplications.map((app) => (
                      <a
                        key={app.id}
                        href={`/admin/applications/${app.id}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {app.firstName} {app.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{app.job.title}</p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status]}`}>
                          {app.status}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {view === "applications" && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name, email, or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="All">All Statuses</option>
                {["New", "Reviewing", "Interview", "Offered", "Hired", "Rejected"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Applications Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Position</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                          No applications found
                        </td>
                      </tr>
                    ) : (
                      filteredApplications.map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-gray-900">{app.firstName} {app.lastName}</p>
                              <p className="text-gray-500 text-xs">{app.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-gray-900">{app.job.title}</p>
                            <p className="text-gray-500 text-xs">{app.job.department}</p>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[app.status]}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <a
                                href={`/admin/applications/${app.id}`}
                                className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                              >
                                View
                              </a>
                              <select
                                value={app.status}
                                onChange={(e) => updateStatus(app.id, e.target.value)}
                                className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-teal-500 outline-none"
                              >
                                {["New", "Reviewing", "Interview", "Offered", "Hired", "Rejected"].map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-sm text-gray-400 mt-4">
              Showing {filteredApplications.length} of {applications.length} applications
            </p>
          </>
        )}

        {view === "postJob" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Post a New Job</h2>
            <p className="text-sm text-gray-500 mb-6">Create a new active job listing.</p>
            <form onSubmit={submitJob} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.title}
                    onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.department}
                    onChange={(e) => setJobForm((f) => ({ ...f, department: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    value={jobForm.location}
                    onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    value={jobForm.type}
                    onChange={(e) => setJobForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    {["Full-time", "Part-time", "Contract", "Internship", "Volunteer"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary (optional)</label>
                  <input
                    type="text"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm((f) => ({ ...f, salary: e.target.value }))}
                    placeholder="e.g. $60,000 - $75,000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  required
                  rows={5}
                  value={jobForm.description}
                  onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements *</label>
                <textarea
                  required
                  rows={5}
                  value={jobForm.requirements}
                  onChange={(e) => setJobForm((f) => ({ ...f, requirements: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Benefits (optional)</label>
                <textarea
                  rows={4}
                  value={jobForm.benefits}
                  onChange={(e) => setJobForm((f) => ({ ...f, benefits: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              {jobError && (
                <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{jobError}</p>
              )}
              {jobSuccess && (
                <p className="text-green-700 text-sm bg-green-50 p-3 rounded-lg">{jobSuccess}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={postingJob}
                  className="bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
                >
                  {postingJob ? "Posting..." : "Post Job"}
                </button>
                <button
                  type="button"
                  onClick={() => { setJobForm(emptyJobForm); setJobError(""); setJobSuccess(""); }}
                  className="px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        )}

        {view === "interviews" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Interview Submissions</h2>
                <p className="text-sm text-gray-500">Round 2 video interviews from candidates.</p>
              </div>
              <span className="text-sm text-gray-400">{interviews.length} total</span>
            </div>
            {interviews.length === 0 ? (
              <p className="px-6 py-10 text-center text-gray-400">No submissions yet.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {interviews.map((s) => (
                  <details key={s.id} className="px-6 py-4">
                    <summary className="cursor-pointer flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{s.fullName}</p>
                        <p className="text-xs text-gray-500">
                          {s.email} · {s.phone}
                          {s.location ? ` · ${s.location}` : ""}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(s.createdAt).toLocaleString()}
                      </span>
                    </summary>
                    <div className="mt-4 space-y-3">
                      {s.linkedIn && (
                        <p className="text-sm">
                          <span className="text-gray-500">LinkedIn:</span>{" "}
                          <a href={s.linkedIn} target="_blank" rel="noreferrer" className="text-teal-700 underline">
                            {s.linkedIn}
                          </a>
                        </p>
                      )}
                      {s.yearsExp && (
                        <p className="text-sm"><span className="text-gray-500">Years exp:</span> {s.yearsExp}</p>
                      )}
                      {Object.entries(s.videoUrls).map(([qid, v]) => (
                        <div key={qid} className="bg-gray-50 rounded-md p-3">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">{qid}</p>
                          <a href={v.webViewLink} target="_blank" rel="noreferrer" className="text-teal-700 underline text-sm">
                            Watch video on Drive
                          </a>
                          {s.answers[qid] && (
                            <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{s.answers[qid]}</p>
                          )}
                        </div>
                      ))}
                      {Object.entries(s.answers).map(([qid, text]) =>
                        s.videoUrls[qid] ? null : (
                          <div key={qid} className="bg-gray-50 rounded-md p-3">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">{qid} (text only)</p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{text}</p>
                          </div>
                        )
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}

        {view === "bookings" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">In-Person Interview Bookings</h2>
                <p className="text-sm text-gray-500">Mexico City · all times shown in local Mexico City time.</p>
              </div>
              <span className="text-sm text-gray-400">{bookings.length} total</span>
            </div>
            {bookings.length === 0 ? (
              <p className="px-6 py-10 text-center text-gray-400">No bookings yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">When</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Candidate</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {new Date(b.slotStart).toLocaleString("en-US", {
                          timeZone: "America/Mexico_City",
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">{b.fullName}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>{b.email}</div>
                        <div className="text-xs text-gray-500">{b.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-pre-wrap">{b.notes || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => cancelBooking(b)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {view === "bookings" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Virtual Interview Requests</h2>
                <p className="text-sm text-gray-500">
                  Candidates who can&apos;t make it in-person and want to be contacted for a video interview.
                </p>
              </div>
              <span className="text-sm text-gray-400">
                {virtualRequests.filter((r) => !r.contactedAt).length} pending · {virtualRequests.length} total
              </span>
            </div>
            {virtualRequests.length === 0 ? (
              <p className="px-6 py-10 text-center text-gray-400">No requests yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Submitted</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Candidate</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {virtualRequests.map((r) => (
                    <tr key={r.id} className={`hover:bg-gray-50 ${r.contactedAt ? "opacity-60" : ""}`}>
                      <td className="px-6 py-4">
                        {r.contactedAt ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">
                            Contacted
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs">
                        {new Date(r.createdAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{r.fullName}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <div>{r.email}</div>
                        {r.phone && <div className="text-xs text-gray-500">{r.phone}</div>}
                      </td>
                      <td className="px-6 py-4 text-gray-600 whitespace-pre-wrap">{r.notes || "—"}</td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleVirtualContacted(r)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold text-stone-700 border border-stone-200 hover:bg-stone-50 mr-2"
                        >
                          {r.contactedAt ? "Mark pending" : "Mark contacted"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteVirtualRequest(r)}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
