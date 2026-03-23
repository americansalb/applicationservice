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
  const [view, setView] = useState<"dashboard" | "applications">("dashboard");
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("aalb_admin_token");
    if (stored) setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchStats();
    fetchApplications();
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
      </div>
    </div>
  );
}
