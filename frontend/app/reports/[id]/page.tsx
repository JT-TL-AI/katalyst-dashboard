"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import {
  ArrowLeft,
  Loader2,
  Send,
  Cpu,
  MessageSquare,
  FileText,
  StickyNote,
} from "lucide-react";
import Link from "next/link";

const API_BASE = "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────

interface ReportDetail {
  id: string | number;
  client_id?: string | number;
  title?: string;
  status?: string;
  report_markdown?: string;
  analyst_notes?: string;
  confidence_scores?: Record<string, string>;
  created_at?: string;
  updated_at?: string;
  version?: number;
}

interface ChatSession {
  id: string | number;
  report_id: string | number;
  title?: string;
}

interface ChatMessage {
  id?: number;
  role: string;
  content: string;
  created_at?: string;
}

type ModelFilter = "both" | "deepseek" | "claude";

// ── Confidence badge inline HTML ───────────────────────────────────────────

function badgeHtml(level: string): string {
  const upper = level.toUpperCase();
  const colorClass =
    upper === "HIGH"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : upper === "MEDIUM"
        ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
        : upper === "LOW"
          ? "bg-red-500/20 text-red-400 border-red-500/30"
          : "bg-gray-500/20 text-gray-400 border-gray-500/30";

  return `<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${colorClass} ml-2 align-middle">${upper}</span>`;
}

function injectConfidenceBadges(
  markdown: string,
  confidence?: Record<string, string>
): string {
  if (!confidence || Object.keys(confidence).length === 0) return markdown;

  return markdown
    .split("\n")
    .map((line) => {
      const match = line.match(/^(#{2,4})\s+(.+)/);
      if (match) {
        const headerText = match[2].trim();
        const level =
          confidence[headerText] || confidence[headerText.toLowerCase()];
        if (level) {
          return `${match[1]} ${headerText} ${badgeHtml(level)}`;
        }
      }
      return line;
    })
    .join("\n");
}

// ── Markdown renderer ──────────────────────────────────────────────────────

function ReportMarkdown({
  markdown,
  confidence,
}: {
  markdown: string;
  confidence?: Record<string, string>;
}) {
  const processed = injectConfidenceBadges(markdown, confidence);

  return (
    <div className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-indigo-400 prose-strong:text-gray-200 prose-code:text-indigo-300 prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700 prose-p:text-gray-300 prose-li:text-gray-300 prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-800 prose-h3:text-base prose-h3:font-semibold prose-h3:text-gray-200 prose-h3:mt-6 prose-h3:mb-2">
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{processed}</ReactMarkdown>
    </div>
  );
}

// ── Chat Panel ─────────────────────────────────────────────────────────────

function ChatPanel({ reportId }: { reportId: string }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [modelFilter, setModelFilter] = useState<ModelFilter>("both");
  const [loadingSession, setLoadingSession] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize or fetch chat session
  useEffect(() => {
    if (!reportId) return;

    async function initSession() {
      setLoadingSession(true);
      try {
        const listRes = await fetch(
          `${API_BASE}/api/chat/sessions?report_id=${reportId}`
        );
        if (listRes.ok) {
          const sessions: ChatSession[] = await listRes.json();
          if (sessions && sessions.length > 0) {
            const s = sessions[0];
            setSessionId(String(s.id));
            const msgRes = await fetch(`${API_BASE}/api/chat/sessions/${s.id}`);
            if (msgRes.ok) {
              const data = await msgRes.json();
              setMessages(data.messages || []);
            }
            setLoadingSession(false);
            return;
          }
        }

        // No session — create one
        const createRes = await fetch(`${API_BASE}/api/chat/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report_id: reportId,
            title: "Report Discussion",
          }),
        });
        if (createRes.ok) {
          const newSession = await createRes.json();
          setSessionId(String(newSession.id));
        }
      } catch (err) {
        console.error("Failed to init chat session:", err);
      } finally {
        setLoadingSession(false);
      }
    }

    initSession();
  }, [reportId]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || !sessionId || sending) return;

    setInput("");
    setSending(true);

    // Optimistic user message
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(
        `${API_BASE}/api/chat/sessions/${sessionId}/message`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || data || []);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (m.role === "user") return true;
    if (modelFilter === "both")
      return m.role === "deepseek" || m.role === "claude";
    return m.role === modelFilter;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-white">
            Report Discussion
          </h3>
        </div>
        {/* Model selector */}
        <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
          {(["both", "deepseek", "claude"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModelFilter(m)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                modelFilter === m
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {m === "both"
                ? "Both"
                : m === "deepseek"
                  ? "DeepSeek"
                  : "Claude"}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingSession && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
          </div>
        )}

        {!loadingSession && filteredMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Cpu className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">
              Start a discussion about this report
            </p>
          </div>
        )}

        {filteredMessages.map((msg, idx) => {
          const isUser = msg.role === "user";
          const isDeepSeek = msg.role === "deepseek";
          const isClaude = msg.role === "claude";

          let alignment = "justify-end";
          let bg = "bg-gray-700";
          let label = "";

          if (isUser) {
            alignment = "justify-end";
            bg = "bg-gray-700";
          } else if (isDeepSeek) {
            alignment = "justify-start";
            bg = "bg-blue-900/60 border border-blue-800/50";
            label = "DeepSeek";
          } else if (isClaude) {
            alignment = "justify-start";
            bg = "bg-orange-900/60 border border-orange-800/50";
            label = "Claude";
          }

          return (
            <div key={idx} className={`flex ${alignment}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 ${bg}`}>
                {label && (
                  <span
                    className={`block text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${
                      isDeepSeek ? "text-blue-400" : "text-orange-400"
                    }`}
                  >
                    {label}
                  </span>
                )}
                <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-3 py-2">
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this report..."
            disabled={sending || !sessionId}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending || !sessionId}
            className="shrink-0 rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ReportStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolved = use(params);
  const reportId = resolved.id;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "notes">("report");

  useEffect(() => {
    if (!reportId) return;

    async function fetchReport() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/reports/${reportId}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Report not found");
          throw new Error(`Failed to fetch: ${res.status}`);
        }
        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
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

  const hasMarkdown = Boolean(report.report_markdown);
  const hasNotes = Boolean(report.analyst_notes);

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* LEFT PANEL (60%) */}
      <div className="w-[60%] flex flex-col border-r border-gray-800 overflow-hidden">
        {/* Report header */}
        <div className="px-6 py-4 border-b border-gray-800 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="text-xl font-bold text-white">
            {report.title || `Report ${report.id}`}
          </h1>
          {report.status && (
            <span className="inline-flex items-center mt-1 rounded-full bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-400 border border-gray-700">
              {report.status}
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-gray-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "report"
                ? "border-indigo-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <FileText className="h-4 w-4" />
            Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === "notes"
                ? "border-indigo-500 text-white"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <StickyNote className="h-4 w-4" />
            Analyst Notes
          </button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === "report" && (
            <>
              {hasMarkdown ? (
                <ReportMarkdown
                  markdown={report.report_markdown!}
                  confidence={report.confidence_scores}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="h-10 w-10 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500">
                    No report content available yet.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === "notes" && (
            <>
              {hasNotes ? (
                <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-strong:text-gray-200">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <StickyNote className="h-4 w-4 text-amber-400" />
                      <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
                        Analyst Notes
                      </h3>
                    </div>
                    <ReactMarkdown>{report.analyst_notes!}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <StickyNote className="h-10 w-10 text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500">
                    No analyst notes for this report.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANEL (40%) */}
      <div className="w-[40%] flex flex-col bg-gray-900/50 overflow-hidden">
        <ChatPanel reportId={reportId} />
      </div>
    </div>
  );
}
