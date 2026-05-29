"use client";

import Link from "next/link";
import {
  FileText,
  Loader2,
  CheckCircle2,
  Send,
  Eye,
} from "lucide-react";

export type ReportStatus =
  | "Draft"
  | "Analyzing"
  | "Ready"
  | "Delivered"
  | "Reviewed";

export interface Report {
  id: string;
  client_id: string;
  client_name?: string;
  engagement_id?: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  version?: number;
  name?: string;
}

export interface Client {
  id: string;
  name: string;
}

const COLUMNS: { key: ReportStatus; label: string; icon: typeof FileText }[] = [
  { key: "Draft", label: "Draft", icon: FileText },
  { key: "Analyzing", label: "Analyzing", icon: Loader2 },
  { key: "Ready", label: "Ready", icon: CheckCircle2 },
  { key: "Delivered", label: "Delivered", icon: Send },
  { key: "Reviewed", label: "Reviewed", icon: Eye },
];

const STATUS_COLORS: Record<ReportStatus, string> = {
  Draft: "bg-gray-600",
  Analyzing: "bg-blue-500",
  Ready: "bg-amber-500",
  Delivered: "bg-green-500",
  Reviewed: "bg-purple-500",
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ReportCard({ report }: { report: Report }) {
  return (
    <Link
      href={`/reports?id=${report.id}`}
      className="block p-4 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-500 transition-colors group"
    >
      {/* Client name */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white truncate">
          {report.client_name || "Unknown Client"}
        </span>
        {report.version != null && (
          <span className="shrink-0 ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-700 text-gray-300">
            v{report.version}
          </span>
        )}
      </div>

      {/* Engagement ID */}
      {report.engagement_id && (
        <p className="text-xs text-gray-400 mb-2 truncate">
          {report.engagement_id}
        </p>
      )}

      {/* Date */}
      <p className="text-xs text-gray-500">{formatDate(report.created_at)}</p>
    </Link>
  );
}

function Column({
  status,
  reports,
}: {
  status: ReportStatus;
  reports: Report[];
}) {
  const col = COLUMNS.find((c) => c.key === status)!;
  const Icon = col.icon;

  return (
    <div className="flex flex-col min-w-[280px] w-[280px] shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[status]}`} />
        <Icon className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          {col.label}
        </h3>
        <span className="ml-auto text-xs text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
          {reports.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[200px]">
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border border-dashed border-gray-700 rounded-lg">
            <FileText className="h-6 w-6 text-gray-600 mb-1" />
            <p className="text-xs text-gray-500">No reports</p>
          </div>
        ) : (
          reports.map((r) => <ReportCard key={r.id} report={r} />)
        )}
      </div>
    </div>
  );
}

interface PipelineBoardProps {
  reports: Report[];
  loading: boolean;
}

export function PipelineBoard({ reports, loading }: PipelineBoardProps) {
  const grouped = COLUMNS.reduce(
    (acc, col) => {
      acc[col.key] = reports.filter((r) => r.status === col.key);
      return acc;
    },
    {} as Record<ReportStatus, Report[]>,
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <Column key={col.key} status={col.key} reports={grouped[col.key]} />
      ))}
    </div>
  );
}
