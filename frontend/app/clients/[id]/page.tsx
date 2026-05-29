"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Check,
  ExternalLink,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface Report {
  id: number | string;
  title: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  version?: number | string;
  client_id?: number | string;
}

interface ClientDetail {
  id: number | string;
  name: string;
  industry?: string;
  revenue?: number | string;
  employee_count?: number;
  location?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  reports?: Report[];
}

function StatusBadge({ status }: { status?: string }) {
  let color: string;
  let label: string;

  switch (status?.toLowerCase()) {
    case "complete":
    case "completed":
    case "final":
      color = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      label = status;
      break;
    case "processing":
    case "in_progress":
    case "in progress":
      color = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      label = status;
      break;
    case "error":
    case "failed":
      color = "bg-red-500/10 text-red-400 border-red-500/20";
      label = status;
      break;
    case "draft":
      color = "bg-gray-500/10 text-gray-400 border-gray-500/20";
      label = status;
      break;
    default:
      color = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      label = status || "Pending";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${color}`}
    >
      {label}
    </span>
  );
}

function fmtDate(raw?: string) {
  if (!raw) return null;
  try {
    const d = new Date(raw);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return raw;
  }
}

function fmtRevenue(rev?: number | string) {
  if (rev == null) return null;
  const n = typeof rev === "string" ? parseFloat(rev) : rev;
  if (isNaN(n)) return null;
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    industry: "",
    revenue: "",
    employee_count: "",
    location: "",
    notes: "",
  });

  const fetchClient = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/clients/${id}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Client not found");
        throw new Error(`Failed to fetch: ${res.status}`);
      }
      const data = await res.json();
      setClient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchClient();
  }, [id, fetchClient]);

  const startEditing = () => {
    if (!client) return;
    setEditForm({
      name: client.name,
      industry: client.industry || "",
      revenue: client.revenue != null ? String(client.revenue) : "",
      employee_count:
        client.employee_count != null ? String(client.employee_count) : "",
      location: client.location || "",
      notes: client.notes || "",
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name.trim(),
      };
      if (editForm.industry.trim()) payload.industry = editForm.industry.trim();
      if (editForm.revenue.trim())
        payload.revenue = parseFloat(editForm.revenue) || 0;
      if (editForm.employee_count.trim())
        payload.employee_count = parseInt(editForm.employee_count) || 0;
      if (editForm.location.trim())
        payload.location = editForm.location.trim();
      if (editForm.notes.trim()) payload.notes = editForm.notes.trim();

      const res = await fetch(`${API_BASE}/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { detail?: string }).detail || `Error: ${res.status}`
        );
      }

      const updated = await res.json();
      setClient(updated);
      setEditing(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update client");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/clients/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(`Failed to delete: ${res.status}`);
      }
      router.push("/clients");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete client");
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.push("/clients")}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </button>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchClient}
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* Client detail */}
      {!loading && !error && client && !editing && (
        <>
          {/* Client Header */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                  <Building2 className="h-7 w-7 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-white truncate">
                    {client.name}
                  </h1>
                  {client.industry && (
                    <span className="inline-flex mt-1 items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300 border border-gray-700">
                      {client.industry}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400">
              {fmtRevenue(client.revenue) && (
                <span className="inline-flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-gray-500" />
                  {fmtRevenue(client.revenue)}
                </span>
              )}
              {client.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  {client.location}
                </span>
              )}
              {client.employee_count != null && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-gray-500" />
                  {client.employee_count}{" "}
                  {client.employee_count === 1 ? "employee" : "employees"}
                </span>
              )}
            </div>

            {client.notes && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <p className="text-sm text-gray-400 whitespace-pre-wrap">
                  {client.notes}
                </p>
              </div>
            )}
          </div>

          {/* Reports Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-400" />
                Reports
              </h2>
              <button
                type="button"
                onClick={() =>
                  router.push(`/upload?client_id=${client.id}`)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Report
              </button>
            </div>

            {(!client.reports || client.reports.length === 0) && (
              <div className="rounded-xl border border-dashed border-gray-800 bg-gray-900/50 p-8 text-center">
                <FileText className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No reports yet for this client
                </p>
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/upload?client_id=${client.id}`)
                  }
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                >
                  <Plus className="h-4 w-4" />
                  Create first report
                </button>
              </div>
            )}

            {client.reports && client.reports.length > 0 && (
              <div className="space-y-3">
                {client.reports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => router.push(`/reports/${report.id}`)}
                    className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors truncate">
                          {report.title || "Untitled Report"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          {fmtDate(report.created_at) && (
                            <span>{fmtDate(report.created_at)}</span>
                          )}
                          {report.version != null && (
                            <span>v{report.version}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {report.status && (
                          <StatusBadge status={report.status} />
                        )}
                        <ExternalLink className="h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Form */}
      {!loading && !error && client && editing && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">
              Edit {client.name}
            </h2>
            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="edit-name"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-name"
                type="text"
                required
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="edit-industry"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Industry
              </label>
              <input
                id="edit-industry"
                type="text"
                value={editForm.industry}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, industry: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="edit-revenue"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Revenue
                </label>
                <input
                  id="edit-revenue"
                  type="number"
                  step="any"
                  value={editForm.revenue}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, revenue: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="edit-employees"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Employees
                </label>
                <input
                  id="edit-employees"
                  type="number"
                  value={editForm.employee_count}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      employee_count: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-location"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Location
              </label>
              <input
                id="edit-location"
                type="text"
                value={editForm.location}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, location: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="edit-notes"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Notes
              </label>
              <textarea
                id="edit-notes"
                rows={3}
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !editForm.name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Delete Client
                </h3>
                <p className="text-sm text-gray-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-300 mb-5">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">{client?.name}</span>?
              All associated reports will also be removed.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
