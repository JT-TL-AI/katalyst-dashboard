"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Loader2,
  CheckCircle2,
  Send,
  Eye,
  Calendar,
  Hash,
  User,
  Clock,
} from "lucide-react";
import type { Report, Client } from "@/components/PipelineBoard";

const API_BASE = "http://localhost:8000";

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: typeof FileText }
> = {
  Draft: { label: "Draft", color: "bg-gray-600", icon: FileText },
  Analyzing: { label: "Analyzing", color: "bg-blue-500", icon: Loader2 },
  Ready: { label: "Ready", color: "bg-amber-500", icon: CheckCircle2 },
  Delivered: { label: "Delivered", color: "bg-green-500", icon: Send },
  Reviewed: { label: "Reviewed", color: "bg-purple-500", icon: Eye },
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function ReportDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [report, setReport] = useState<Report | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No report ID provided");
      setLoading(false);
      return;
    }

    async function fetchReport() {
      try {
        const res = await fetch(`${API_BASE}/api/reports/`);
        if (!res.ok) throw new Error("Failed to fetch");
        const reports: Report[] = await res.json();
        const found = reports.find((r) => r.id === id);
        if (!found) throw new Error("Report not found");
        setReport(found);

        try {
          const clientRes = await fetch(`${API_BASE}/api/clients/`);
          if (clientRes.ok) {
            const clients: Client[] = await clientRes.json();
            const c = clients.find((c) => c.id === found.client_id);
            if (c) setClient(c);
          }
        } catch {
          // client fetch is optional
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <FileText className="h-12 w-12 text-gray-600 mb-4" />
        <h2 className="text-lg font-medium text-gray-300 mb-2">
          {error || "Report not found"}
        </h2>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:text-indigo-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS_META[report.status] || STATUS_META.Draft;
  const StatusIcon = statusMeta.icon;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${statusMeta.color}`} />
          <StatusIcon className="h-5 w-5 text-gray-400" />
          <span
            className={`text-sm font-medium px-2.5 py-1 rounded-full ${statusMeta.color} text-white`}
          >
            {statusMeta.label}
          </span>
          {report.version != null && (
            <span className="text-xs font-mono bg-gray-800 text-gray-400 px-2 py-1 rounded">
              v{report.version}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white">
          {client?.name || "Unknown Client"}
        </h1>
        {report.engagement_id && (
          <p className="text-sm text-gray-400 mt-1">{report.engagement_id}</p>
        )}
      </div>

      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
          Report Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-sm text-gray-200">
                {formatDate(report.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Updated</p>
              <p className="text-sm text-gray-200">
                {formatDate(report.updated_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Hash className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Report ID</p>
              <p className="text-sm text-gray-200 font-mono">{report.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-gray-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="text-sm text-gray-200">
                {client?.name || "Unknown"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
      }
    >
      <ReportDetailContent />
    </Suspense>
  );
}
