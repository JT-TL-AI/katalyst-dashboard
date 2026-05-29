"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  X,
  Loader2,
  Library,
  Search,
  Filter,
  Trash2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Tag,
  Building2,
  FileText,
  AlertTriangle,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface LibraryItem {
  id: number | string;
  title: string;
  source?: string;
  industry?: string;
  report_type?: string;
  content_markdown?: string;
  key_insights?: string;
  tags?: string[] | string;
}

interface FormState {
  title: string;
  source: string;
  industry: string;
  report_type: string;
  content_markdown: string;
  key_insights: string;
  tags: string;
}

const INITIAL_FORM: FormState = {
  title: "",
  source: "",
  industry: "",
  report_type: "",
  content_markdown: "",
  key_insights: "",
  tags: "",
};

function parseTags(tags?: string[] | string): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean);
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function SkeletonCard() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-5 animate-pulse">
      <div className="h-5 w-3/4 bg-gray-800 rounded mb-3" />
      <div className="h-3 w-1/2 bg-gray-800 rounded mb-4" />
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 bg-gray-800 rounded-full" />
        <div className="h-5 w-20 bg-gray-800 rounded-full" />
      </div>
      <div className="h-3 w-full bg-gray-800 rounded mb-1" />
      <div className="h-3 w-5/6 bg-gray-800 rounded" />
    </div>
  );
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Expanded card
  const [expandedId, setExpandedId] = useState<number | string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (industryFilter) params.set("industry", industryFilter);

      const url = `${API_BASE}/api/library/${params.toString() ? "?" + params.toString() : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library");
    } finally {
      setLoading(false);
    }
  }, [search, industryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Extract unique industries
  const industries = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.industry) set.add(item.industry);
    });
    return Array.from(set).sort();
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
      };
      if (form.source.trim()) payload.source = form.source.trim();
      if (form.industry.trim()) payload.industry = form.industry.trim();
      if (form.report_type.trim())
        payload.report_type = form.report_type.trim();
      if (form.content_markdown.trim())
        payload.content_markdown = form.content_markdown.trim();
      if (form.key_insights.trim())
        payload.key_insights = form.key_insights.trim();
      if (form.tags.trim()) {
        payload.tags = form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }

      const res = await fetch(`${API_BASE}/api/library/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { detail?: string }).detail || `Error: ${res.status}`
        );
      }

      setShowModal(false);
      setForm(INITIAL_FORM);
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (expandedId == null) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/library/${expandedId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          (errData as { detail?: string }).detail || `Error: ${res.status}`
        );
      }
      setExpandedId(null);
      setShowDeleteConfirm(false);
      await fetchItems();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  const expandedItem = expandedId != null
    ? items.find((i) => i.id === expandedId) ?? null
    : null;

  // --- RENDER ---

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Library</h1>
          <p className="text-sm text-gray-400 mt-1">
            Reference materials to train the AI on your consulting domain
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <Plus className="h-4 w-4" />
          Add Reference
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search titles and key insights…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="w-full sm:w-48 appearance-none rounded-lg border border-gray-700 bg-gray-800 pl-10 pr-8 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
          >
            <option value="">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-3">{error}</p>
          <button
            type="button"
            onClick={fetchItems}
            className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-300 mb-1">
            No references yet
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Add your first consulting report to train the AI.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Reference
          </button>
        </div>
      )}

      {/* Cards Grid */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isExpanded = item.id === expandedId;
            const tags = parseTags(item.tags);

            return (
              <div
                key={item.id}
                className={`rounded-xl bg-gray-900 border transition-colors ${
                  isExpanded
                    ? "border-indigo-500/50 ring-1 ring-indigo-500/20"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                {/* Card Header (always visible) */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : item.id)
                  }
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-indigo-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                    )}
                  </div>

                  {item.source && (
                    <p className="text-xs text-gray-500 mb-2 truncate">
                      {item.source}
                    </p>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    {item.industry && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300 border border-gray-700">
                        <Building2 className="h-3 w-3" />
                        {item.industry}
                      </span>
                    )}
                    {item.report_type && (
                      <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300 border border-indigo-500/20">
                        {item.report_type}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {tags.slice(0, 4).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                      {tags.length > 4 && (
                        <span className="text-xs text-gray-600">
                          +{tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Truncated key insights */}
                  {item.key_insights && (
                    <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">
                      {item.key_insights}
                    </p>
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-800 pt-4">
                    {/* Full content_markdown */}
                    {item.content_markdown && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Full Report
                        </h4>
                        <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 text-sm text-gray-300 leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap font-mono text-xs">
                          {item.content_markdown}
                        </div>
                      </div>
                    )}

                    {/* Full key insights */}
                    {item.key_insights && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Key Insights
                        </h4>
                        <div className="rounded-lg bg-gray-950 border border-gray-800 p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {item.key_insights}
                        </div>
                      </div>
                    )}

                    {/* Full tags */}
                    {tags.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Tags
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-1 text-xs text-gray-300 border border-gray-700"
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delete */}
                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Reference
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-400">
                          Are you sure?
                        </span>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={deleting}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                        >
                          {deleting && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          {deleting ? "Deleting…" : "Yes, delete"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={deleting}
                          className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Reference Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !submitting && setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                Add Reference
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={submitting}
                className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="lib-title"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="lib-title"
                  type="text"
                  required
                  placeholder="Report title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="lib-source"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Source
                </label>
                <input
                  id="lib-source"
                  type="text"
                  placeholder="e.g. McKinsey, Internal, HBR"
                  value={form.source}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, source: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="lib-industry"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Industry
                  </label>
                  <input
                    id="lib-industry"
                    type="text"
                    placeholder="e.g. Healthcare"
                    value={form.industry}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, industry: e.target.value }))
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lib-report-type"
                    className="block text-sm font-medium text-gray-300 mb-1.5"
                  >
                    Report Type
                  </label>
                  <input
                    id="lib-report-type"
                    type="text"
                    placeholder="e.g. Analysis, Case Study"
                    value={form.report_type}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        report_type: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="lib-content"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Content (Markdown)
                </label>
                <textarea
                  id="lib-content"
                  rows={6}
                  placeholder="Full report content in markdown…"
                  value={form.content_markdown}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      content_markdown: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="lib-insights"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Key Insights
                </label>
                <textarea
                  id="lib-insights"
                  rows={3}
                  placeholder="Key takeaways and insights…"
                  value={form.key_insights}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      key_insights: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="lib-tags"
                  className="block text-sm font-medium text-gray-300 mb-1.5"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="lib-tags"
                  type="text"
                  placeholder="e.g. strategy, growth, digital-transformation"
                  value={form.tags}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tags: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                  className="flex-1 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Creating…" : "Add Reference"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
