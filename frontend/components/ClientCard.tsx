"use client";

import { Building2, MapPin, DollarSign } from "lucide-react";

export interface Client {
  id: number | string;
  name: string;
  industry?: string;
  revenue?: number | string;
  employee_count?: number;
  location?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface ClientCardProps {
  client: Client;
  onClick: () => void;
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const fmtRevenue = (rev?: number | string) => {
    if (rev == null) return null;
    const n = typeof rev === "string" ? parseFloat(rev) : rev;
    if (isNaN(n)) return null;
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:bg-gray-850 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-white truncate">
            {client.name}
          </h3>
        </div>
        {client.industry && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-300 border border-gray-700">
            {client.industry}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
        {fmtRevenue(client.revenue) && (
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            {fmtRevenue(client.revenue)}
          </span>
        )}
        {client.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {client.location}
          </span>
        )}
        {client.employee_count != null && (
          <span>
            {client.employee_count}{" "}
            {client.employee_count === 1 ? "employee" : "employees"}
          </span>
        )}
      </div>
    </button>
  );
}
