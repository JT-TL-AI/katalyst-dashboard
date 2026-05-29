"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  Clock,
  Send,
  Plus,
  Activity,
  RefreshCw,
} from "lucide-react";
import { PipelineBoard, type Report, type Client } from "@/components/PipelineBoard";

const API_BASE = "http://localhost:8000";

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-5 rounded-xl bg-gray-900 border border-gray-800">
      <div className="shrink-0 p-2.5 rounded-lg bg-gray-800">
        <Icon className="h-5 w-5 text-indigo-400" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {label}
        </p>
        {loading ? (
          <div className="h-7 w-12 mt-1 rounded bg-gray-800 animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

function RecentActivity({ reports }: { reports: Report[] }) {
  const recent = [...reports]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Recent Activity
        </h2>
      </div>

      {recent.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {recent.map((r) => (
            <Link
              key={r.id}
              href={`/reports?id=${r.id}`}
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
              <span className="text-sm text-white truncate max-w-[160px]">
                {r.client_name || "Unknown"}
              </span>
              <span className="text-xs text-gray-500 shrink-0">
                {formatTimeAgo(r.updated_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

export default function PipelineDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsRes, clientsRes] = await Promise.all([
        fetch(`${API_BASE}/api/reports/`),
        fetch(`${API_BASE}/api/clients/`),
      ]);

      if (!reportsRes.ok || !clientsRes.ok) {
        throw new Error("Failed to fetch data from API");
      }

      const reportsData: Report[] = await reportsRes.json();
      const clientsData: Client[] = await clientsRes.json();

      // Enrich reports with client names
      const clientMap = new Map(clientsData.map((c) => [c.id, c.name]));
      const enriched = reportsData.map((r) => ({
        ...r,
        client_name: clientMap.get(r.client_id) ?? undefined,
      }));

      setReports(enriched);
      setClients(clientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const readyCount = reports.filter((r) => r.status === "Ready").length;
  const inProgressCount = reports.filter(
    (r) => r.status === "Draft" || r.status === "Analyzing",
  ).length;
  const deliveredCount = reports.filter(
    (r) => r.status === "Delivered" || r.status === "Reviewed",
  ).length;

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Overview of engagement reports across all clients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Engagement
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm">
          {error}
          <button
            onClick={fetchData}
            className="ml-3 underline hover:text-red-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Clients"
          value={clients.length}
          icon={Users}
          loading={loading}
        />
        <StatCard
          label="Reports Ready"
          value={readyCount}
          icon={FileText}
          loading={loading}
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={Clock}
          loading={loading}
        />
        <StatCard
          label="Delivered"
          value={deliveredCount}
          icon={Send}
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      {!loading && <RecentActivity reports={reports} />}

      {/* Pipeline Board */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Pipeline Board
        </h2>
        <PipelineBoard reports={reports} loading={loading} />
      </div>

      {/* Empty state: no reports at all */}
      {!loading && reports.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="h-12 w-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-300 mb-2">
            No reports yet
          </h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Upload an engagement to get started. Reports will appear here as
            they move through the pipeline.
          </p>
          <Link
            href="/upload"
            className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Engagement
          </Link>
        </div>
      )}
    </div>
  );
}
